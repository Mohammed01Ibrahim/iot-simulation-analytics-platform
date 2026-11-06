import { randomUUID } from 'node:crypto';
import mqtt from 'mqtt';
import { config } from './config.js';
import { database, storage, ensureBucket, broker, sleep, streamText } from './infra.js';
import { generate, parseCsv } from './domain.js';

const {db,client}=await database();const s3=storage();await ensureBucket(s3);
const mq=await broker();const consume=await mq.connection.createChannel();await consume.prefetch(8);
const owner=randomUUID();const workers=db.collection('workers');
// A single leased scheduler owns generation; consumers use idempotent Mongo message IDs.
const lease=await workers.findOneAndUpdate({_id:'simulation-worker',$or:[{expiresAt:{$lt:new Date().toISOString()}},{owner}]},{$set:{owner,expiresAt:new Date(Date.now()+8000).toISOString(),heartbeat:new Date().toISOString()}},{returnDocument:'after'});
if(!lease){try{await workers.insertOne({_id:'simulation-worker',owner,expiresAt:new Date(Date.now()+8000).toISOString(),heartbeat:new Date().toISOString()});}catch{throw new Error('Another simulation worker holds the lease');}}
const mqttClient=mqtt.connect(config.mqttUrl,{username:config.mqttUser,password:config.mqttPass,reconnectPeriod:1000,connectTimeout:5000});
mqttClient.on('error',e=>console.error('MQTT:',e.message));
let running=true;
mq.connection.on('close',()=>{console.error('RabbitMQ connection closed; exiting for supervisor restart');process.exit(1);});
const heartbeat=setInterval(async()=>{
  try{const r=await workers.updateOne({_id:'simulation-worker',owner},{$set:{heartbeat:new Date().toISOString(),expiresAt:new Date(Date.now()+8000).toISOString(),mqtt:mqttClient.connected}});if(!r.matchedCount)process.exit(1);}catch(e){console.error('Worker heartbeat failed:',e.message);process.exit(1);}
},1000);

await consume.consume(config.queue,async raw=>{
  if(!raw)return;let message;
  try{
    message=JSON.parse(raw.content.toString());
    if(!message.messageId||!message.sessionId||!message.payload)throw new Error('Invalid envelope');
    await db.collection('messages').updateOne({_id:message.messageId},{$setOnInsert:{...message,receivedAt:new Date().toISOString(),state:'pending',delivery:{},attempts:0}},{upsert:true});
    let saved=await db.collection('messages').findOne({_id:message.messageId});
    if(['delivered','failed'].includes(saved.state)){consume.ack(raw);return;}
    for(let attempt=saved.attempts;attempt<3;attempt++){
      try{
        for(const target of message.targets){
          if(saved.delivery[target])continue;
          if(target==='mqtt'){
            if(!mqttClient.connected)throw new Error('MQTT disconnected');
            await mqttClient.publishAsync(`iot/${message.deviceId}/readings`,JSON.stringify(message),{qos:1});
          }else if(target==='http'){
            const r=await fetch(config.httpSink,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':message.messageId},body:JSON.stringify(message),signal:AbortSignal.timeout(3000)});
            if(!r.ok)throw new Error(`HTTP sink returned ${r.status}`);
          }
          saved.delivery[target]=new Date().toISOString();
          await db.collection('messages').updateOne({_id:message.messageId},{$set:{[`delivery.${target}`]:saved.delivery[target]}});
        }
        await db.collection('messages').updateOne({_id:message.messageId},{$set:{state:'delivered',attempts:attempt+1,completedAt:new Date().toISOString()},$unset:{error:''}});
        consume.ack(raw);return;
      }catch(e){
        await db.collection('messages').updateOne({_id:message.messageId},{$set:{attempts:attempt+1,error:e.message,state:attempt===2?'failed':'pending'}});
        if(attempt<2)await sleep(250*(attempt+1));
      }
    }consume.ack(raw); // Failed delivery is retained in Mongo for inspection, never reported as successful.
  }catch(e){console.error('Consumer:',e.message);if(message?.messageId)consume.nack(raw,false,true);else consume.nack(raw,false,false);}
});

const due=new Map(),replays=new Map();
console.log('Simulation worker connected: RabbitMQ → MongoDB + MQTT/HTTP');
process.on('SIGINT',close);process.on('SIGTERM',close);
while(running){
  const sessions=await db.collection('sessions').find({status:'running'}).toArray();
  for(const session of sessions){
    try{
      if(session.mode==='replay'&&!replays.has(session._id))replays.set(session._id,parseCsv(await streamText(await s3.getObject(config.bucket,session.datasetKey))));
      let allDone=true;
      for(const device of session.devices){
        if(!running)break;
        const key=`${session._id}:${device._id}`,index=session.sequence[device._id]??0;
        if(session.mode==='replay'&&index>=replays.get(session._id).length)continue;
        allDone=false;if((due.get(key)||0)>Date.now())continue;
        // Re-check the persisted state before each publication; a control can leave one in-flight message.
        if(!await db.collection('sessions').findOne({_id:session._id,status:'running'}))break;
        const payload=session.mode==='replay'?replays.get(session._id)[index]:generate(device.fields,index);
        const message={messageId:`${session._id}:${device._id}:${index}`,sessionId:session._id,deviceId:device.deviceId,deviceName:device.name,sensorType:device.sensorType,sequence:index,generatedAt:new Date().toISOString(),payload,targets:session.targets};
        await new Promise((resolve,reject)=>mq.channel.publish(config.exchange,`sensor.${device.sensorType.replace(/[^a-zA-Z0-9_-]/g,'_')}`,Buffer.from(JSON.stringify(message)),{persistent:true,contentType:'application/json',messageId:message.messageId},e=>e?reject(e):resolve()));
        await db.collection('sessions').updateOne({_id:session._id},{$inc:{published:1},$set:{[`sequence.${device._id}`]:index+1}});
        due.set(key,Date.now()+device.intervalMs);
      }
      if(allDone&&session.mode==='replay')await db.collection('sessions').updateOne({_id:session._id,status:'running'},{$set:{status:'completed',updatedAt:new Date().toISOString()}});
    }catch(e){console.error('Generator:',e.message);await db.collection('sessions').updateOne({_id:session._id,status:'running'},{$set:{status:'failed',error:e.message,updatedAt:new Date().toISOString()}});}
  }
  // Bound memory when sessions finish or are paused.
  const active=new Set(sessions.map(s=>s._id));
  for(const k of due.keys())if(!active.has(k.split(':')[0]))due.delete(k);
  for(const k of replays.keys())if(!active.has(k))replays.delete(k);
  await sleep(50);
}
async function close(){running=false;clearInterval(heartbeat);await workers.deleteOne({_id:'simulation-worker',owner});await mqttClient.endAsync();await mq.connection.close();await client.close();process.exit(0);}
