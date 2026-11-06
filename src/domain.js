import { z } from 'zod';
import { parse } from 'csv-parse/sync';

const key = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/).refine(x => !['constructor', 'prototype', '__proto__'].includes(x));
const field = z.object({
  name: key, type: z.enum(['number', 'text', 'timestamp', 'status']),
  min: z.number().finite().min(-1e9).max(1e9).optional(),
  max: z.number().finite().min(-1e9).max(1e9).optional(),
  pattern: z.enum(['random', 'sine', 'sequence']).default('random'),
  unit: z.string().max(16).default(''),
  values: z.array(z.string().min(1).max(100)).min(1).max(20).optional(),
}).strict().superRefine((f,ctx) => {
  if(f.type==='number' && ((f.min??0) > (f.max??100))) ctx.addIssue({code:'custom',message:'Minimum must not exceed maximum'});
});
export const deviceInput = z.object({
  name: z.string().trim().min(1).max(80),
  deviceId: z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/),
  sensorType: z.string().trim().min(1).max(40),
  location: z.string().trim().max(80).default('Simulation lab'),
  intervalMs: z.number().int().min(100).max(60000),
  fields: z.array(field).min(1).max(24).refine(fs=>new Set(fs.map(f=>f.name)).size===fs.length,'Field names must be unique'),
}).strict();
export const sessionInput = z.object({
  name: z.string().trim().min(1).max(80),
  deviceIds: z.array(z.string()).min(1).max(100).refine(a=>new Set(a).size===a.length,'Devices must be unique'),
  targets: z.array(z.enum(['mqtt','http'])).max(2).default([]),
  mode: z.enum(['generate','replay']).default('generate'),
  csv: z.string().max(500000).optional(),
}).strict().superRefine((s,c)=>{if(s.mode==='replay'&&!s.csv)c.addIssue({code:'custom',message:'CSV is required for replay'});});

const transitions = { ready: {start:'running',stop:'stopped'}, running:{pause:'paused',stop:'stopped'}, paused:{resume:'running',stop:'stopped'} };
export function transition(status, action) {
  const next=transitions[status]?.[action];
  if(!next) throw Object.assign(new Error(`Cannot ${action} a ${status} session`),{status:409});
  return next;
}
export function generate(fields, index, now = new Date(), random = Math.random) {
  return Object.fromEntries(fields.map(f=>{
    let value;
    if(f.type==='number'){
      const min=f.min??0,max=f.max??100;
      const ratio=f.pattern==='sine'?(Math.sin(index/8)+1)/2:f.pattern==='sequence'?(index%101)/100:random();
      value=Math.round((min+(max-min)*ratio)*100)/100;
    } else if(f.type==='timestamp') value=now.toISOString();
    else {const values=f.values??(f.type==='status'?['online','online','online','warning']:['sensor']);value=values[index%values.length];}
    return [f.name,value];
  }));
}
export function parseCsv(text) {
  const records=parse(text,{columns: headers=>{
    if(headers.length>24||new Set(headers).size!==headers.length)throw new Error('CSV needs 1–24 unique columns');
    headers.forEach(h=>key.parse(h));return headers;
  },skip_empty_lines:true,bom:true,max_record_size:12000,cast:(v,c)=>!c.header&&v.trim()!==''&&Number.isFinite(Number(v))?Number(v):v});
  if(!records.length||records.length>5000)throw new Error('CSV must contain 1–5000 rows');
  return records;
}
export function toCsv(records) {
  const cols=['messageId','sessionId','deviceId','generatedAt',...new Set(records.flatMap(r=>Object.keys(r.payload)))];
  const cell=v=>{let s=String(v??'');if(/^[=+@\-]/.test(s)&&typeof v!=='number')s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return [cols.map(cell).join(','),...records.map(r=>cols.map(k=>cell(k in r?r[k]:r.payload[k])).join(','))].join('\n')+'\n';
}
