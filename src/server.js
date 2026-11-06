import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { database, storage, ensureBucket, broker } from './infra.js';
import { deviceInput, sessionInput, transition, parseCsv, toCsv } from './domain.js';

const {db,client}=await database();
const s3=storage();await ensureBucket(s3);
const mq=await broker();let brokerReady=true;
mq.connection.on('close',()=>{brokerReady=false;});
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'700kb'}));
app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','same-origin');next();});
app.get('/api/health',async(req,res)=>{
  const [mongo,minio,worker]=await Promise.allSettled([db.command({ping:1}),s3.bucketExists(config.bucket),db.collection('workers').findOne({_id:'simulation-worker'})]);
  const workerOk=worker.status==='fulfilled'&&worker.value&&Date.now()-new Date(worker.value.heartbeat)<5000;
  const services={mongodb:mongo.status==='fulfilled',rabbitmq:brokerReady,minio:minio.status==='fulfilled'&&minio.value,worker:Boolean(workerOk),mqtt:Boolean(workerOk&&worker.value.mqtt)};
  res.status(Object.values(services).every(Boolean)?200:503).json({status:Object.values(services).every(Boolean)?'healthy':'degraded',services,time:new Date().toISOString()});
});
app.use('/api',(req,res,next)=>{
  if(config.apiToken&&req.headers.authorization!==`Bearer ${config.apiToken}`)return res.status(401).json({error:'API token required'});
  if(!['GET','HEAD'].includes(req.method)&&req.headers.origin){
    const origin=new URL(req.headers.origin);
    if(![req.headers.host,'127.0.0.1:5173','localhost:5173'].includes(origin.host))return res.status(403).json({error:'Origin rejected'});
  }next();
});
const fail=(status,message)=>Object.assign(new Error(message),{status});
app.get('/api/devices',async(req,res)=>res.json(await db.collection('devices').find().sort({createdAt:1}).toArray()));
app.post('/api/devices',async(req,res)=>{
  const body=deviceInput.parse(req.body);const d={_id:randomUUID(),...body,createdAt:new Date().toISOString()};
  await db.collection('devices').insertOne(d);res.status(201).json(d);
});
app.put('/api/devices/:id',async(req,res)=>{
  const body=deviceInput.parse(req.body);
  const d=await db.collection('devices').findOneAndUpdate({_id:req.params.id},{$set:{...body,updatedAt:new Date().toISOString()}},{returnDocument:'after'});
  if(!d)throw fail(404,'Device not found');res.json(d);
});
app.delete('/api/devices/:id',async(req,res)=>{
  if(await db.collection('sessions').findOne({deviceIds:req.params.id,status:{$in:['running','paused','ready']}}))throw fail(409,'Stop associated sessions before deleting this device');
  const d=await db.collection('devices').deleteOne({_id:req.params.id});if(!d.deletedCount)throw fail(404,'Device not found');res.status(204).end();
});
app.get('/api/sessions',async(req,res)=>res.json(await db.collection('sessions').find({},{projection:{csvRows:0}}).sort({createdAt:-1}).limit(200).toArray()));
app.post('/api/sessions',async(req,res)=>{
  const b=sessionInput.parse(req.body);
  const devices=await db.collection('devices').find({_id:{$in:b.deviceIds}}).toArray();
  if(devices.length!==b.deviceIds.length)throw fail(400,'One or more devices do not exist');
  const id=randomUUID();let datasetKey=null,rowCount=0;
  if(b.mode==='replay'){
    let rows;try{rows=parseCsv(b.csv);}catch(e){throw fail(400,`Invalid CSV: ${e.message}`);}
    rowCount=rows.length;datasetKey=`datasets/${id}.csv`;
    await s3.putObject(config.bucket,datasetKey,Buffer.from(b.csv),Buffer.byteLength(b.csv),{'Content-Type':'text/csv'});
  }
  const session={_id:id,name:b.name,deviceIds:b.deviceIds,devices,targets:[...new Set(b.targets)],mode:b.mode,datasetKey,rowCount,status:'ready',published:0,sequence:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await db.collection('sessions').insertOne(session);res.status(201).json(session);
});
app.post('/api/sessions/:id/:action',async(req,res,next)=>{
  if(req.params.action==='export')return next();
  const current=await db.collection('sessions').findOne({_id:req.params.id});if(!current)throw fail(404,'Session not found');
  const status=transition(current.status,req.params.action);
  const result=await db.collection('sessions').findOneAndUpdate({_id:current._id,status:current.status},{$set:{status,updatedAt:new Date().toISOString()}},{returnDocument:'after'});
  if(!result)throw fail(409,'Session changed; refresh and retry');res.json(result);
});
app.get('/api/messages',async(req,res)=>{
  const filter={};if(req.query.sessionId)filter.sessionId=String(req.query.sessionId);if(req.query.deviceId)filter.deviceId=String(req.query.deviceId);
  const limit=Math.min(500,Math.max(1,Number(req.query.limit)||100));
  res.json(await db.collection('messages').find(filter).sort({receivedAt:-1}).limit(limit).toArray());
});
export async function snapshot(){
  const since=new Date(Date.now()-60000).toISOString();
  const [devices,sessions,total,delivered,failed,recent,worker]=await Promise.all([
    db.collection('devices').find().sort({createdAt:1}).toArray(),
    db.collection('sessions').find().sort({createdAt:-1}).limit(200).toArray(),
    db.collection('messages').countDocuments(),db.collection('messages').countDocuments({state:'delivered'}),db.collection('messages').countDocuments({state:'failed'}),
    db.collection('messages').find({receivedAt:{$gte:since}}).sort({receivedAt:-1}).limit(2000).toArray(),
    db.collection('workers').findOne({_id:'simulation-worker'}),
  ]);
  const running=sessions.filter(s=>s.status==='running');
  const last10=new Date(Date.now()-10000).toISOString();
  const count10=await db.collection('messages').countDocuments({receivedAt:{$gte:last10}});
  return {devices,sessions,stats:{activeDevices:new Set(running.flatMap(s=>s.deviceIds)).size,runningSessions:running.length,received:total,delivered,failed,published:sessions.reduce((a,s)=>a+s.published,0),throughput:count10/10},recent,worker,now:new Date().toISOString()};
}
app.get('/api/overview',async(req,res)=>res.json(await snapshot()));
app.get('/api/events',async(req,res)=>{
  res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.flushHeaders();
  let closed=false,busy=false;const send=async()=>{if(closed||busy)return;busy=true;try{res.write(`data: ${JSON.stringify(await snapshot())}\n\n`);}catch{res.write('event: error\ndata: {"error":"Snapshot unavailable"}\n\n');}finally{busy=false;}};
  const timer=setInterval(send,1000);req.on('close',()=>{closed=true;clearInterval(timer);});await send();
});
app.post('/api/sessions/:id/export',async(req,res)=>{
  const session=await db.collection('sessions').findOne({_id:req.params.id});if(!session)throw fail(404,'Session not found');
  const count=await db.collection('messages').countDocuments({sessionId:session._id});
  if(count>50000)throw fail(413,'Export limit is 50,000 messages; use smaller sessions');
  const rows=await db.collection('messages').find({sessionId:session._id}).sort({receivedAt:1}).toArray();
  const id=randomUUID(),key=`exports/${id}.csv`,body=Buffer.from(toCsv(rows));
  await s3.putObject(config.bucket,key,body,body.length,{'Content-Type':'text/csv'});
  const record={_id:id,sessionId:session._id,key,rows:rows.length,bytes:body.length,createdAt:new Date().toISOString()};
  await db.collection('exports').insertOne(record);res.status(201).json({...record,url:`/api/exports/${id}`});
});
app.get('/api/exports/:id',async(req,res)=>{
  const record=await db.collection('exports').findOne({_id:req.params.id});if(!record)throw fail(404,'Export not found');
  const stream=await s3.getObject(config.bucket,record.key);res.set({'Content-Type':'text/csv','Content-Disposition':`attachment; filename="iot-session-${record.sessionId}.csv"`});stream.on('error',()=>res.destroy());stream.pipe(res);
});
app.use('/api',(req,res)=>res.status(404).json({error:'API route not found'}));
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
app.use(express.static(dist));app.get('/{*splat}',(req,res)=>res.sendFile(path.join(dist,'index.html')));
app.use((err,req,res,next)=>{
  const status=err.name==='ZodError'?400:err.code===11000?409:err.status||500;
  if(status>=500)console.error(err);
  res.status(status).json({error:err.name==='ZodError'?err.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):err.code===11000?'Device identifier already exists':status>=500?'Service unavailable; inspect server logs':err.message});
});
const server=app.listen(config.port,config.host,()=>console.log(`IoT API + dashboard http://${config.host}:${config.port}`));
async function close(){server.close();await Promise.allSettled([mq.connection.close(),client.close()]);process.exit(0);}
process.on('SIGTERM',close);process.on('SIGINT',close);
