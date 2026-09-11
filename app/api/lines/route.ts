import {requireActor} from '@/lib/access';
import {lineDetail} from '@/lib/audit';
import {db,config,failure,mutationGuard} from '@/lib/storage';
import {type Line} from '@/lib/atlas';
import {prepareLine,sameLine} from '@/lib/registration';
export async function GET(){try{await requireActor();const rows=await db().prepare('SELECT id,data,version,updated_at FROM lines ORDER BY updated_at DESC').all<{id:string,data:string,version:number,updated_at:string}>();return Response.json({lines:rows.results.map(x=>({...JSON.parse(x.data),id:x.id,version:x.version,updatedAt:x.updated_at}))},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(req:Request){
 const guard=mutationGuard(req);if(guard)return guard;
 try{
  const actor=await requireActor(),c=await config();let d:Line;
  try{d=prepareLine(await req.json(),c)}catch(e){return Response.json({error:(e as Error).message},{status:400})}
  const id=d.id||crypto.randomUUID(),stamp=new Date().toISOString();
  const exists=await db().prepare('SELECT data,version FROM lines WHERE id=?').bind(id).first<{data:string,version:number}>();
  if((exists&&exists.version!==d.version)||(!exists&&(d.id||d.version!==0)))return Response.json({error:'Esta linha foi alterada em outra sessão. Feche e recarregue antes de editar.'},{status:409});
  if(exists&&sameLine(JSON.parse(exists.data),d))return Response.json({line:JSON.parse(exists.data)});
  const version=exists?exists.version+1:1,payload=JSON.stringify({...d,id,version,updatedAt:stamp});
  // Check the same settings revision inside the write, preventing stale device bindings.
  const write=exists?db().prepare("UPDATE lines SET number=?,device_id=?,slot=?,data=?,version=?,updated_at=? WHERE id=? AND version=? AND COALESCE((SELECT version FROM settings WHERE id='main'),0)=?").bind(d.number,d.deviceId,d.slot,payload,version,stamp,id,d.version,c.version):db().prepare("INSERT INTO lines(id,number,device_id,slot,data,version,updated_at) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT version FROM settings WHERE id='main'),0)=?").bind(id,d.number,d.deviceId,d.slot,payload,version,stamp,c.version);
  const detail=JSON.stringify(lineDetail(exists?JSON.parse(exists.data):null,JSON.parse(payload),c,actor));
  const audit=db().prepare('INSERT INTO history(id,line_id,version,data,created_at,detail) SELECT ?,id,version,data,updated_at,? FROM lines WHERE id=? AND updated_at=? AND version=? AND changes()=1').bind(crypto.randomUUID(),detail,id,stamp,version);
  const results=await db().batch([write,audit]);
  if(!results[0].meta.changes)return Response.json({error:'Outra sessão alterou a linha ou os aparelhos. Recarregue os dados antes de salvar.'},{status:409});
  return Response.json({line:JSON.parse(payload)});
 }catch(e){return failure(e)}
}
