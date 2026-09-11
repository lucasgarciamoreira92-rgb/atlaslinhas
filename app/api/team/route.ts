import {z} from 'zod';
import {requireActor} from '@/lib/access';
import {db,failure,mutationGuard} from '@/lib/storage';
export async function GET(){try{await requireActor(true);const rows=await db().prepare('SELECT email,name,role,active,is_owner,version,user_id IS NOT NULL AS joined FROM members ORDER BY is_owner DESC,name').all();return Response.json({members:rows.results},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
const schema=z.object({email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),name:z.string().trim().min(1).max(200),active:z.boolean(),version:z.number().int().nonnegative()});
export async function POST(req:Request){const guard=mutationGuard(req);if(guard)return guard;try{await requireActor(true);const p=schema.safeParse(await req.json());if(!p.success)return Response.json({error:'Informe nome e e-mail válidos.'},{status:400});const d=p.data,stamp=new Date().toISOString();
 const result=d.version===0?await db().prepare("INSERT OR IGNORE INTO members(email,name,role,active,is_owner,version,updated_at) VALUES(?,?,'operator',?,0,1,?)").bind(d.email,d.name,Number(d.active),stamp).run():await db().prepare('UPDATE members SET name=?,active=?,version=version+1,updated_at=? WHERE email=? AND version=? AND is_owner=0').bind(d.name,Number(d.active),stamp,d.email,d.version).run();
 if(!result.meta.changes)return Response.json({error:'Cadastro já existente, alterado em outra sessão ou protegido. Recarregue a equipe.'},{status:409});return Response.json({ok:true});}catch(e){return failure(e)}}
