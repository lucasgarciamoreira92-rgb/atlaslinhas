import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {db} from './storage';
export type Actor={id:string;name:string;email:string;role:'admin'|'operator'};
export class AccessError extends Error {constructor(message:string,public status:number){super(message)}}
export async function requireActor(admin=false):Promise<Actor>{
 const user=await getChatGPTUser();
 if(!user)throw new AccessError('Entre com sua conta para acessar o Atlas Linhas.',401);
 const email=user.email.trim().toLowerCase();
 const owner=(env as unknown as Record<string,string|undefined>).ATLAS_OWNER_EMAIL?.trim().toLowerCase();
 if(owner&&email===owner){
  await db().prepare('INSERT OR IGNORE INTO members(email,user_id,name,role,active,is_owner,version,updated_at) VALUES(?,?,?,?,1,1,1,?)').bind(email,user.userId,user.displayName,'admin',new Date().toISOString()).run();
 }
 // Email is only used to claim a pre-authorized invitation; subsequent access uses the stable Site user ID.
 await db().prepare('UPDATE members SET user_id=? WHERE email=? AND user_id IS NULL AND active=1').bind(user.userId,email).run();
 const member=await db().prepare('SELECT email,name,role,active FROM members WHERE user_id=?').bind(user.userId).first<{email:string,name:string,role:'admin'|'operator',active:number}>();
 if(!member||!member.active)throw new AccessError('Seu acesso ainda não foi autorizado ou está bloqueado. Fale com o administrador.',403);
 if(admin&&member.role!=='admin')throw new AccessError('Somente o administrador pode gerenciar a equipe.',403);
 return {id:user.userId,email:member.email,name:member.name,role:member.role};
}
