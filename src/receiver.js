import express from 'express';
const app=express();app.use(express.json({limit:'100kb'}));
const records=new Map();let count=0;
app.post('/ingest',(req,res)=>{
  const id=req.get('Idempotency-Key');if(!id||id!==req.body.messageId)return res.status(400).json({error:'Missing idempotency key'});
  if(!records.has(id)){count++;records.set(id,req.body);if(records.size>1000)records.delete(records.keys().next().value);}
  res.status(202).json({accepted:id});
});
app.get('/health',(req,res)=>res.json({status:'ok'}));
app.get('/records',(req,res)=>res.json({count,recent:[...records.values()].slice(-50)}));
app.listen(Number(process.env.RECEIVER_PORT||4200),process.env.HOST||'127.0.0.1',()=>console.log('HTTP verification receiver ready'));
