import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {z} from 'zod';
import {sqlite,dataDirectory} from './environment';
import {requireActor,AccessError} from '@/lib/access';
import {verifySessionPassword,sessionHash} from './auth';
import {authorizedRow,policyOf,transaction,audit,stamp} from './access-service';
const digest=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
function vaultKey(){
 const path=join(dataDirectory,'vault.key');
 const state=sqlite.prepare("SELECT key_hash FROM access_vault_state WHERE id='main'").get();
 if(!existsSync(path)){if(state||sqlite.prepare('SELECT 1 FROM access_accounts WHERE secret IS NOT NULL LIMIT 1').get())throw new AccessError('A chave do Cofre está ausente. Restaure vault.key da cópia completa da instalação.',503);writeFileSync(path,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}
 const hex=readFileSync(path,'utf8').trim();if(!/^[0-9a-f]{64}$/.test(hex))throw new AccessError('A chave do Cofre é inválida. Restaure a chave original.',503);chmodSync(path,0o600);const key=Buffer.from(hex,'hex'),hash=digest(key);
 if(state&&state.key_hash!==hash)throw new AccessError('A chave não corresponde ao Cofre desta instalação.',503);if(!state)sqlite.prepare("INSERT INTO access_vault_state VALUES('main',?)").run(hash);return key;
}
const secretSchema=z.object({password:z.string().max(4096),recoveryCodes:z.string().max(20000)}).strict().refine(d=>!!d.password||!!d.recoveryCodes,'Informe uma senha ou os códigos de recuperação.');
const secretWriteSchema=z.object({password:z.string().min(1).max(4096).optional(),recoveryCodes:z.string().min(1).max(20000).optional()}).strict().refine(d=>!!d.password||!!d.recoveryCodes,'Preencha ao menos um campo para atualizar.');
const boxSchema=z.object({v:z.literal(1),iv:z.string().regex(/^[0-9a-f]{24}$/),tag:z.string().regex(/^[0-9a-f]{32}$/),body:z.string().regex(/^[0-9a-f]+$/).max(200000)}).strict();
export function sealSecret(id:string,version:number,value:z.infer<typeof secretSchema>){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',vaultKey(),iv);cipher.setAAD(Buffer.from('atlas-vault-v1:'+id+':'+version));const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return JSON.stringify({v:1,iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex'),body:body.toString('hex')})}
export function openSecret(id:string,version:number,sealed:string){try{const b=boxSchema.parse(JSON.parse(sealed)),dec=createDecipheriv('aes-256-gcm',vaultKey(),Buffer.from(b.iv,'hex'));dec.setAAD(Buffer.from('atlas-vault-v1:'+id+':'+version));dec.setAuthTag(Buffer.from(b.tag,'hex'));return secretSchema.parse(JSON.parse(Buffer.concat([dec.update(Buffer.from(b.body,'hex')),dec.final()]).toString('utf8')))}catch(e){if(e instanceof AccessError)throw e;throw new AccessError('Não foi possível abrir a credencial. Confira a chave e o backup original.',503)}}
export async function vaultPOST(req:Request){let actor=await requireActor();const input=z.object({action:z.string()}).passthrough().parse(await req.json());
 if(input.action==='unlock'){
  const d=z.object({action:z.literal('unlock'),id:z.string().max(100),password:z.string().min(1).max(128),scope:z.enum(['vault','quick']),purpose:z.enum(['read','write'])}).strict().parse(input);
  authorizedRow(actor,d.id,d.purpose==='read'?'reveal':'edit');await verifySessionPassword(req,d.password);actor=await requireActor();
  const row=authorizedRow(actor,d.id,d.purpose==='read'?'reveal':'edit'),policy=policyOf(row);if(d.scope==='quick'&&!policy.quickAccess)throw new AccessError('Esta credencial só pode ser aberta na seção Cofre.',403);if(d.purpose==='write'&&d.scope!=='vault')throw new AccessError('Edite a credencial na seção Cofre.',403);
  const token=randomBytes(32).toString('hex'),expiresAt=Date.now()+60000;transaction(()=>{sqlite.prepare('DELETE FROM access_unlocks WHERE expires_at<?').run(Date.now());sqlite.prepare('INSERT INTO access_unlocks VALUES(?,?,?,?,?,?,?)').run(digest(token),sessionHash(req),row.id,row.version,row.secret_version,d.scope+':'+d.purpose,expiresAt);audit(actor,row.id,'vault-unlocked',{scope:d.scope,purpose:d.purpose})});return Response.json({token,expiresAt});
 }
 const d=z.object({action:z.enum(['read','write']),id:z.string().max(100),token:z.string().regex(/^[a-f0-9]{64}$/),scope:z.enum(['vault','quick']),field:z.enum(['password','recoveryCodes']).optional(),intent:z.enum(['reveal','copy']).optional(),secret:secretWriteSchema.optional()}).strict().parse(input);
 return transaction(()=>{const row=authorizedRow(actor,d.id,d.action==='read'?'reveal':'edit'),policy=policyOf(row);if(d.scope==='quick'&&!policy.quickAccess)throw new AccessError('Abra esta credencial dentro do Cofre.',403);
 const unlock=sqlite.prepare('SELECT * FROM access_unlocks WHERE token_hash=? AND session_hash=? AND account_id=? AND expires_at>?').get(digest(d.token),sessionHash(req),row.id,Date.now());
 if(!unlock||unlock.version!==row.version||unlock.secret_version!==row.secret_version||unlock.scope!==d.scope+':'+d.action)throw new AccessError('Desbloqueie o Cofre novamente para continuar.',403);
 if(d.action==='read'){if(!d.field||!d.intent||!row.secret)throw new AccessError('Credencial não cadastrada ou campo inválido.',400);const secret=openSecret(row.id,row.secret_version,row.secret);audit(actor,row.id,d.intent==='copy'?'secret-copy-requested':'secret-revealed',{field:d.field,scope:d.scope});return Response.json({value:secret[d.field],expiresAt:unlock.expires_at});}
 if(!d.secret||d.scope!=='vault')throw new AccessError('Informe a credencial dentro do Cofre.',400);const previous=row.secret?openSecret(row.id,row.secret_version,row.secret):{password:'',recoveryCodes:''};const version=row.secret_version+1,sealed=sealSecret(row.id,version,{...previous,...d.secret});sqlite.prepare('UPDATE access_accounts SET secret=?,secret_version=?,version=version+1,updated_at=? WHERE id=?').run(sealed,version,stamp(),row.id);audit(actor,row.id,'secret-updated',{credentialVersion:version});return Response.json({ok:true});
 });
}
