import {requireActor} from '@/lib/access';
import {deviceValues} from '@/lib/audit';
import {db,config,failure,mutationGuard} from '@/lib/storage';
import {type Config,type Line} from '@/lib/atlas';
import {prepareConfig,deviceSlots} from '@/lib/registration';
export async function GET(){try{await requireActor();return Response.json({config:await config()},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(req:Request){
 const guard=mutationGuard(req);if(guard)return guard;
 try{
  const actor=await requireActor(),previous=await config();
  const referenced=await db().prepare('SELECT data FROM lines WHERE device_id IS NOT NULL').all<{data:string}>();let c:Config;
  try{c=prepareConfig(await req.json(),referenced.results.map(x=>JSON.parse(x.data) as Line))}catch(e){return Response.json({error:(e as Error).message},{status:400})}
  if(previous.version!==c.version)return Response.json({error:'As configurações mudaram. Recarregue antes de salvar.'},{status:409});
  const version=c.version+1,payload=JSON.stringify({...c,version});
  const devices=JSON.stringify(c.devices.map(d=>({...d,slots:deviceSlots(d)})));
  // Validate references in the same statement, including lines added since the read above.
  const valid="NOT EXISTS (SELECT 1 FROM lines l WHERE l.device_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM json_each(?) d,json_each(d.value,'$.slots') s WHERE json_extract(d.value,'$.id')=l.device_id AND s.value=l.slot))";
  const write=c.version===0?db().prepare(`INSERT OR IGNORE INTO settings(id,data,version) SELECT ?,?,? WHERE ${valid}`).bind('main',payload,version,devices):db().prepare(`UPDATE settings SET data=?,version=? WHERE id=? AND version=? AND ${valid}`).bind(payload,version,'main',c.version,devices);
  const oldDevices=JSON.stringify(Object.fromEntries(previous.devices.map(d=>[d.id,deviceValues(d)]))),newDevices=JSON.stringify(Object.fromEntries(c.devices.map(d=>[d.id,deviceValues(d)])));
  // A single INSERT captures exactly the lines linked at the instant of the settings write.
  const audit=db().prepare("INSERT INTO history(id,line_id,version,data,created_at,detail) SELECT lower(hex(randomblob(16))),l.id,l.version,l.data,?,json_object('kind','device','actor',json(?),'beforeDevice',json(od.value),'afterDevice',json(nd.value)) FROM lines l JOIN json_each(?) od ON od.key=l.device_id JOIN json_each(?) nd ON nd.key=l.device_id WHERE od.value<>nd.value AND changes()=1").bind(new Date().toISOString(),JSON.stringify(actor),oldDevices,newDevices);
  const [result]=await db().batch([write,audit]);
  if(!result.meta.changes)return Response.json({error:'As configurações ou os vínculos dos aparelhos foram alterados em outra sessão. Recarregue antes de salvar.'},{status:409});
  return Response.json({config:JSON.parse(payload)});
 }catch(e){return failure(e)}
}
