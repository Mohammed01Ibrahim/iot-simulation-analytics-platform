import { MongoClient } from 'mongodb';
import amqp from 'amqplib';
import { Client } from 'minio';
import { config } from './config.js';

export async function database() {
  const client = new MongoClient(config.mongoUrl,{serverSelectionTimeoutMS:5000});
  await client.connect();const db=client.db(config.dbName);
  await Promise.all([
    db.collection('devices').createIndex({deviceId:1},{unique:true}),
    db.collection('messages').createIndex({sessionId:1,receivedAt:-1}),
    db.collection('messages').createIndex({receivedAt:-1}),
  ]);return {client,db};
}
export function storage() {
  return new Client({endPoint:config.minioHost,port:config.minioPort,useSSL:config.minioSsl,accessKey:config.minioKey,secretKey:config.minioSecret});
}
export async function ensureBucket(s3) {
  if(await s3.bucketExists(config.bucket))return;
  try{await s3.makeBucket(config.bucket);}catch(e){
    // API and worker can race to create the bucket on a fresh deployment.
    if(e.code!=='BucketAlreadyOwnedByYou')throw e;
  }
}
export async function broker() {
  const connection=await amqp.connect(config.amqpUrl);
  connection.on('error',e=>console.error('AMQP connection:',e.message));
  const channel=await connection.createConfirmChannel();
  await channel.assertExchange(config.exchange,'topic',{durable:true});
  await channel.assertQueue(config.queue,{durable:true});
  await channel.bindQueue(config.queue,config.exchange,'sensor.#');
  return {connection,channel};
}
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function streamText(stream) {const chunks=[];for await(const c of stream)chunks.push(c);return Buffer.concat(chunks).toString('utf8');}
