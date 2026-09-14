import {z} from 'zod';
import {requireActor} from '@/lib/access';
import {config,db} from '@/lib/storage';
import {normalizeNumber,type Line} from '@/lib/atlas';
import {deviceSlots,locationOf} from '@/lib/registration';

const querySchema=z.object({
 kind:z.enum(['lines','devices']),
 query:z.string().trim().max(200).default(''),
 offset:z.coerce.number().int().min(0).max(100000).default(0),
 limit:z.coerce.number().int().min(1).max(20).default(10),
}).strict();
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

// Local read-only catalog. No provider calls, vault imports or arbitrary SQL.
// Keep the pilot admin-only, consistently with /api/assistant.
export async function assistantCatalogGET(req:Request){
 await requireActor(true);
 const {kind,query,offset,limit}=querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
 const c=await config();
 const rows=await db().prepare('SELECT id,data,version FROM lines ORDER BY id').all<{id:string;data:string;version:number}>();
 const lines=rows.results.map(row=>({...JSON.parse(row.data),id:row.id,version:row.version}) as Line);
 const devices=c.devices.map(d=>({
  id:d.id,name:d.name,type:d.type,model:d.model,location:d.location,owner:d.owner,
  slots:deviceSlots(d).map(slot=>({slot,lineId:lines.find(l=>l.deviceId===d.id&&l.slot===slot)?.id??null})),
 }));
 // Explicit field allowlist: no notes, credentials, keys, recovery codes or history.
 const entries=kind==='devices'?devices:lines.map(l=>({
  id:l.id,name:l.name,number:l.number,carrier:l.carrier,status:l.status,
  owner:l.owner,team:l.team,version:l.version,deviceId:l.deviceId,slot:l.slot,
  location:locationOf(l,c),device:devices.find(d=>d.id===l.deviceId)??null,
 }));
 const term=normalize(query),number=normalizeNumber(query);
 const matches=entries.filter(entry=>{
  const fields=kind==='devices'
   ?[(entry as typeof devices[number]).id,entry.name,(entry as typeof devices[number]).model,entry.owner,entry.location]
   :[entry.id,entry.name,entry.owner,entry.location,(entry as {team:string}).team,(entry as {number:string}).number];
  return fields.some(value=>normalize(value??'').includes(term))||
   (kind==='lines'&&/^\d+$/.test(number)&&(entry as {number:string}).number.includes(number));
 });
 await requireActor(true);
 return Response.json({kind,query,items:matches.slice(offset,offset+limit),total:matches.length,
  nextOffset:offset+limit<matches.length?offset+limit:null,
  needsSelection:matches.length>1,settingsVersion:c.version,readOnly:true,
 },{headers:{'Cache-Control':'no-store'}});
}
