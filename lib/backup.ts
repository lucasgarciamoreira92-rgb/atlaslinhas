import {accessSnapshotSchema,type AccessSnapshot} from './accounts';
import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db} from './storage';
import {AccessError,type Actor} from './access';
import {defaultConfig,lineSchema,configSchema,type Line,type Config} from './atlas';
import {prepareConfig,prepareLine} from './registration';
import {lineValues,type AuditDetail} from './audit';
const MAX_BYTES=8*1024*1024;
export type HistoryRow={id:string;line_id:string;version:number;data:string;created_at:string;detail:string|null};
export type Snapshot={app:'atlas-linhas';schemaVersion:1;createdAt:string;revision:number;config:Config;lines:Line[];history:HistoryRow[];access?:AccessSnapshot};
type AccessBackupAdapter={queries:()=>D1PreparedStatement[];read:(results:D1Result[])=>AccessSnapshot;validate:(target:Snapshot)=>Promise<void>;restore:(target:AccessSnapshot|undefined,current:AccessSnapshot|undefined,actor:Actor)=>D1PreparedStatement[]};
function accessModule(){return (env as unknown as {ATLAS_ACCESS_BACKUP?:AccessBackupAdapter}).ATLAS_ACCESS_BACKUP}
export type Envelope={payload:Snapshot;signature:string};
const encoder=new TextEncoder();
export function bucket(){const value=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!value)throw new AccessError('O armazenamento de backups está indisponível.',503);return value}
async function key(){const secret=(env as unknown as {ATLAS_BACKUP_KEY?:string}).ATLAS_BACKUP_KEY;if(!secret)throw new AccessError('O backup ainda não está configurado.',503);return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
export async function sign(value:unknown){return hex(await crypto.subtle.sign('HMAC',await key(),encoder.encode(JSON.stringify(value))))}
export async function verify(value:unknown,signature:string){if(!/^[0-9a-f]{64}$/.test(signature))return false;return crypto.subtle.verify('HMAC',await key(),Uint8Array.from(signature.match(/../g)!,s=>parseInt(s,16)),encoder.encode(JSON.stringify(value)))}
export async function readBody(req:Request){const reader=req.body?.getReader();if(!reader)throw new AccessError('Escolha um arquivo de backup.',400);const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new AccessError('O arquivo excede o limite de 8 MB.',413)}chunks.push(value)}const merged=new Uint8Array(size);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.length}try{return JSON.parse(new TextDecoder().decode(merged))}catch{throw new AccessError('Arquivo JSON inválido.',400)}}
export async function snapshot():Promise<Snapshot>{
 const results=await db().batch([
  db().prepare("INSERT OR IGNORE INTO storage_revision(id,revision) VALUES('main',0)"),
  db().prepare("SELECT revision FROM storage_revision WHERE id='main'"),
  db().prepare("SELECT data,version FROM settings WHERE id='main'"),
  db().prepare('SELECT id,data,version,updated_at FROM lines ORDER BY id'),
  db().prepare('SELECT id,line_id,version,data,created_at,detail FROM history ORDER BY created_at,rowid'),
  ...(accessModule()?.queries()||[])
 ]);
 const revision=(results[1].results[0] as {revision:number}).revision,c=results[2].results[0] as {data:string,version:number}|undefined;
 return {app:'atlas-linhas',schemaVersion:1,createdAt:new Date().toISOString(),revision,config:c?{...JSON.parse(c.data),version:c.version}:defaultConfig,lines:(results[3].results as {id:string,data:string,version:number,updated_at:string}[]).map(l=>({...JSON.parse(l.data),id:l.id,version:l.version,updatedAt:l.updated_at})),history:results[4].results as HistoryRow[],...(accessModule()?{access:accessModule()!.read(results.slice(5))}:{})};
}
export async function envelope(payload:Snapshot):Promise<Envelope>{const file={payload,signature:await sign(payload)};if(encoder.encode(JSON.stringify(file)).length>MAX_BYTES-4096)throw new AccessError('Este backup excede 8 MB. A exportação CSV continua disponível.',413);return file}
const snapshotSchema=z.object({app:z.literal('atlas-linhas'),schemaVersion:z.literal(1),createdAt:z.string().datetime(),revision:z.number().int().nonnegative(),config:configSchema,lines:z.array(lineSchema).max(10000),history:z.array(z.object({id:z.string().min(1).max(100),line_id:z.string().min(1).max(100),version:z.number().int().positive(),data:z.string(),created_at:z.string().datetime(),detail:z.string().nullable()})).max(100000),access:accessSnapshotSchema.optional()});
export async function validateFile(value:unknown):Promise<Envelope>{
 const outer=z.object({payload:z.unknown(),signature:z.string()}).safeParse(value);if(!outer.success||!await verify(outer.data.payload,outer.data.signature))throw new AccessError('Backup inválido, modificado ou gerado por outra aplicação. Use o arquivo original baixado no Atlas Linhas.',400);
 const parsed=snapshotSchema.safeParse(outer.data.payload);if(!parsed.success)throw new AccessError('A estrutura deste backup não é compatível com esta versão.',400);
 const data=parsed.data;try{const ids=new Set(),numbers=new Set(),slots=new Set();for(const line of data.lines){if(!line.id||ids.has(line.id)||numbers.has(line.number))throw Error('Linhas duplicadas.');ids.add(line.id);numbers.add(line.number);prepareLine(line,data.config);if(line.deviceId){const slot=line.deviceId+'|'+line.slot;if(slots.has(slot))throw Error('Slots duplicados.');slots.add(slot)}}prepareConfig(data.config,data.lines);const events=new Set();for(const h of data.history){if(events.has(h.id))throw Error('Histórico duplicado.');events.add(h.id);JSON.parse(h.data);if(h.detail)JSON.parse(h.detail)}}catch(e){throw new AccessError('Backup inconsistente: '+(e as Error).message,400)}
 await accessModule()?.validate(data);
 // Retain original signed values rather than transformations from validation.
 return outer.data as Envelope;
}
export function summary(current:Snapshot,target:Snapshot){const existing=new Map(current.lines.map(l=>[l.id,l])),incoming=new Set(target.lines.map(l=>l.id));let changed=0;for(const line of target.lines){const previous=existing.get(line.id);if(previous&&JSON.stringify(lineValues(previous,current.config))!==JSON.stringify(lineValues(line,target.config)))changed++}return {createdAt:target.createdAt,currentLines:current.lines.length,backupLines:target.lines.length,devices:target.config.devices.length,historyEvents:target.history.length,...(accessModule()?{accounts:target.access?.accounts.length??current.access?.accounts.length??0,credentials:(target.access?.accounts||current.access?.accounts||[]).filter(a=>a.secret).length,accessMode:target.access?'replace':'preserve'}:{}),added:target.lines.filter(l=>!existing.has(l.id)).length,changed,removed:current.lines.filter(l=>!incoming.has(l.id)).length}}
export async function storeBackup(file:Envelope,actor:Actor,kind:'manual'|'before-restore'){
 const id=crypto.randomUUID(),objectKey='backups/'+id+'.json',createdAt=new Date().toISOString();await bucket().put(objectKey,JSON.stringify(file),{httpMetadata:{contentType:'application/json'}});
 return {id,objectKey,createdAt,actor:JSON.stringify(actor),kind,lineCount:file.payload.lines.length,historyCount:file.payload.history.length,sourceDate:file.payload.createdAt,revision:file.payload.revision};
}
export type StoredBackup=Awaited<ReturnType<typeof storeBackup>>;
export function backupInsert(b:StoredBackup,expectedRevision?:number){return expectedRevision===undefined?db().prepare('INSERT INTO backups(id,object_key,kind,created_at,actor,line_count,history_count,source_date,revision) VALUES(?,?,?,?,?,?,?,?,?)').bind(b.id,b.objectKey,b.kind,b.createdAt,b.actor,b.lineCount,b.historyCount,b.sourceDate,b.revision):db().prepare("INSERT INTO backups(id,object_key,kind,created_at,actor,line_count,history_count,source_date,revision) VALUES(?,?,?,?,?,?,?,?,CASE WHEN (SELECT revision FROM storage_revision WHERE id='main')=? THEN ? ELSE -1 END)").bind(b.id,b.objectKey,b.kind,b.createdAt,b.actor,b.lineCount,b.historyCount,b.sourceDate,expectedRevision,b.revision)}
function chunks<T>(items:T[]):T[][]{const result:T[][]=[];let chunk:T[]=[],size=0;for(const item of items){const length=encoder.encode(JSON.stringify(item)).length;if(length>500000)throw new AccessError('Um registro excede o tamanho permitido para recuperação.',413);if(size+length>500000){result.push(chunk);chunk=[];size=0}chunk.push(item);size+=length}if(chunk.length)result.push(chunk);return result}
export async function restore(target:Snapshot,current:Snapshot,safety:StoredBackup,actor:Actor){
 const stamp=new Date().toISOString(),version=Math.max(0,...current.lines.map(l=>l.version),...target.lines.map(l=>l.version))+1,configVersion=Math.max(current.config.version,target.config.version)+1;
 const restored=target.lines.map(l=>({...l,version,updatedAt:stamp})),old=new Map(current.lines.map(l=>[l.id,l])),newIds=new Set(restored.map(l=>l.id));
 const events:HistoryRow[]=[...restored,...current.lines.filter(l=>!newIds.has(l.id))].map(l=>{const removed=!newIds.has(l.id);const before=old.get(l.id);const detail:AuditDetail={kind:'restored',actor,before:before?lineValues(before,current.config):null,after:removed?{'Recuperação':'Linha ausente no backup restaurado'}:{...lineValues(l,target.config),'Recuperação':'Backup de '+target.createdAt}};return {id:crypto.randomUUID(),line_id:l.id!,version,data:JSON.stringify(l),created_at:stamp,detail:JSON.stringify(detail)}});
 const queries=[backupInsert(safety,current.revision),...(accessModule()?.restore(target.access,current.access,actor)||[]),db().prepare('DELETE FROM lines'),db().prepare("INSERT INTO settings(id,data,version) VALUES('main',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version").bind(JSON.stringify({...target.config,version:configVersion}),configVersion)];
 for(const chunk of chunks(restored))queries.push(db().prepare("INSERT INTO lines(id,number,device_id,slot,data,version,updated_at) SELECT json_extract(value,'$.id'),json_extract(value,'$.number'),json_extract(value,'$.deviceId'),json_extract(value,'$.slot'),value,json_extract(value,'$.version'),json_extract(value,'$.updatedAt') FROM json_each(?)").bind(JSON.stringify(chunk)));
 // Existing audit events remain immutable. Recover missing events from the signed snapshot.
 for(const chunk of chunks([...target.history,...events]))queries.push(db().prepare("INSERT OR IGNORE INTO history(id,line_id,version,data,created_at,detail) SELECT json_extract(value,'$.id'),json_extract(value,'$.line_id'),json_extract(value,'$.version'),json_extract(value,'$.data'),json_extract(value,'$.created_at'),json_extract(value,'$.detail') FROM json_each(?)").bind(JSON.stringify(chunk)));
 try{await db().batch(queries)}catch(e){if(String(e).includes('backup_revision_valid'))throw new AccessError('Os dados mudaram depois da conferência. Analise o backup novamente.',409);throw e}
}
