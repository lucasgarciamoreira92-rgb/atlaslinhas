import {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {z} from 'zod';
import {sqlite} from './environment';
import {identityContext,type LocalIdentity} from './identity';
import {requireActor,AccessError} from '@/lib/access';
const derive=promisify(scrypt),cookieName='atlas_session',ttl=8*60*60*1000;
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const passwordSchema=z.string().min(12,'Use uma senha com pelo menos 12 caracteres.').max(128,'A senha deve ter até 128 caracteres.');
const emailSchema=z.string().trim().email().max(254).transform(v=>v.toLowerCase());
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=await derive(password,salt,64) as Buffer;return `scrypt:${salt}:${hash.toString('hex')}`}
async function validPassword(password:string,hash:string){const [kind,salt,encoded]=hash.split(':');if(kind!=='scrypt'||!salt||!encoded)return false;const actual=await derive(password,salt,64) as Buffer,expected=Buffer.from(encoded,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual)}
function token(req:Request){return req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)||''}
export function sessionIdentity(req:Request):LocalIdentity|null{const t=token(req);if(!/^[0-9a-f]{64}$/.test(t))return null;const row=sqlite.prepare('SELECT m.user_id,m.email,m.name FROM local_sessions s JOIN members m ON m.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND m.active=1').get(digest(t),Date.now());return row?{userId:String(row.user_id),email:String(row.email),displayName:String(row.name)}:null}
function session(userId:string){const t=randomBytes(32).toString('hex');sqlite.prepare('DELETE FROM local_sessions WHERE expires_at<?').run(Date.now());sqlite.prepare('INSERT INTO local_sessions VALUES(?,?,?)').run(digest(t),userId,Date.now()+ttl);return `${cookieName}=${t}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl/1000}`}
function json(value:unknown,status=200,cookie?:string){return Response.json(value,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}})}
function rateLimit(key:string,max:number){const now=Date.now();sqlite.prepare('DELETE FROM local_login_attempts WHERE reset_at<?').run(now);const row=sqlite.prepare('INSERT INTO local_login_attempts(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').get(key,now+15*60*1000);if(Number(row!.attempts)>max)throw new AccessError('Muitas tentativas. Aguarde 15 minutos e tente novamente.',429)}
export function authStatus(req:Request){return json({setupRequired:!sqlite.prepare('SELECT 1 FROM local_credentials LIMIT 1').get(),authenticated:!!sessionIdentity(req)})}
export async function authAction(action:string,req:Request){
 if(action==='logout'){sqlite.prepare('DELETE FROM local_sessions WHERE token_hash=?').run(digest(token(req)));return json({ok:true},200,`${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`)}
 const input=await req.json();
 if(action==='setup'){
  if(sqlite.prepare('SELECT 1 FROM local_credentials LIMIT 1').get())throw new AccessError('A configuração inicial já foi concluída.',409);
  const d=z.object({name:z.string().trim().min(1).max(200),email:emailSchema,password:passwordSchema}).parse(input),passwordHash=await hashPassword(d.password),id=randomUUID();
  sqlite.exec('BEGIN IMMEDIATE');try{
   if(sqlite.prepare('SELECT 1 FROM local_credentials LIMIT 1').get())throw new AccessError('A configuração inicial já foi concluída.',409);
   sqlite.prepare("INSERT INTO members(email,user_id,name,role,active,is_owner,version,updated_at) VALUES(?,?,?,'admin',1,1,1,?)").run(d.email,id,d.name,new Date().toISOString());
   sqlite.prepare('INSERT INTO local_credentials VALUES(?,?)').run(id,passwordHash);sqlite.exec('COMMIT');
  }catch(e){sqlite.exec('ROLLBACK');throw e}
  return json({ok:true},201,session(id));
 }
 if(action==='login'){
  const d=z.object({email:emailSchema,password:z.string().min(1).max(128)}).parse(input);rateLimit('global',100);rateLimit(digest(d.email),10);
  const row=sqlite.prepare('SELECT m.user_id,m.active,c.password_hash FROM members m JOIN local_credentials c ON c.user_id=m.user_id WHERE m.email=?').get(d.email);
  const hash=row?String(row.password_hash):'scrypt:00000000000000000000000000000000:'+('0'.repeat(128));
  if(!await validPassword(d.password,hash)||!row||!row.active)throw new AccessError('E-mail ou senha incorretos, ou acesso bloqueado.',401);
  sqlite.prepare('DELETE FROM local_login_attempts WHERE key=?').run(digest(d.email));return json({ok:true},200,session(String(row.user_id)));
 }
 if(action==='password'){
  const actor=await requireActor();const d=z.object({currentPassword:z.string().max(128),password:passwordSchema}).parse(input);rateLimit('password:'+actor.id,10);
  const row=sqlite.prepare('SELECT password_hash FROM local_credentials WHERE user_id=?').get(actor.id);
  if(!row||!await validPassword(d.currentPassword,String(row.password_hash)))throw new AccessError('A senha atual está incorreta.',400);
  const hash=await hashPassword(d.password);
  sqlite.exec('BEGIN IMMEDIATE');try{const result=sqlite.prepare('UPDATE local_credentials SET password_hash=? WHERE user_id=? AND password_hash=?').run(hash,actor.id,row.password_hash);if(!result.changes)throw new AccessError('A senha mudou em outra sessão. Entre novamente.',409);sqlite.prepare('DELETE FROM local_sessions WHERE user_id=?').run(actor.id);sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}
  return json({ok:true},200,session(actor.id));
 }
 return json({error:'Operação não encontrada.'},404);
}
export async function teamPost(req:Request){
 await requireActor(true);const d=z.object({email:emailSchema,name:z.string().trim().min(1).max(200),active:z.boolean(),version:z.number().int().nonnegative(),password:passwordSchema.optional()}).parse(await req.json());
 if(!d.version&&!d.password)throw new AccessError('Defina uma senha inicial para o operador.',400);
 const hash=d.password?await hashPassword(d.password):null,stamp=new Date().toISOString();
 sqlite.exec('BEGIN IMMEDIATE');try{
  if(d.version===0){const id=randomUUID();const result=sqlite.prepare("INSERT OR IGNORE INTO members(email,user_id,name,role,active,is_owner,version,updated_at) VALUES(?,?,?,'operator',?,0,1,?)").run(d.email,id,d.name,Number(d.active),stamp);if(!result.changes)throw new AccessError('Este e-mail já está cadastrado.',409);sqlite.prepare('INSERT INTO local_credentials VALUES(?,?)').run(id,hash!)}
  else{const member=sqlite.prepare('SELECT user_id FROM members WHERE email=? AND version=? AND is_owner=0').get(d.email,d.version);if(!member)throw new AccessError('Cadastro protegido ou alterado. Recarregue a equipe.',409);sqlite.prepare('UPDATE members SET name=?,active=?,version=version+1,updated_at=? WHERE email=?').run(d.name,Number(d.active),stamp,d.email);if(hash)sqlite.prepare('UPDATE local_credentials SET password_hash=? WHERE user_id=?').run(hash,member.user_id);if(hash||!d.active)sqlite.prepare('DELETE FROM local_sessions WHERE user_id=?').run(member.user_id)}
  sqlite.exec('COMMIT');
 }catch(e){sqlite.exec('ROLLBACK');throw e}
 return json({ok:true});
}
export function errorResponse(e:unknown){if(e instanceof SyntaxError)return json({error:'JSON inválido.'},400);if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||'Confira os campos.'},400);if(e instanceof AccessError)return json({error:e.message},e.status);console.error('[Atlas local]',e);return json({error:'Não foi possível concluir. Confira o terminal e tente novamente.'},500)}
