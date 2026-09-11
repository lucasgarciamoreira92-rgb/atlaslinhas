import {z} from 'zod';
import {requireActor,AccessError} from '@/lib/access';
import {failure,mutationGuard} from '@/lib/storage';
import {readBody,validateFile,snapshot,summary,sign,verify,envelope,storeBackup,restore} from '@/lib/backup';
const tokenSchema=z.object({payload:z.object({purpose:z.literal('restore'),fileSignature:z.string(),revision:z.number().int().nonnegative(),userId:z.string(),expiresAt:z.number()}),signature:z.string()});
export async function POST(req:Request){const guard=mutationGuard(req);if(guard)return guard;try{
 const actor=await requireActor(true),body=await readBody(req);
 if(!body||typeof body!=='object'||(body.mode!=='preview'&&body.mode!=='restore'))throw new AccessError('Escolha analisar ou restaurar o backup.',400);
 const file=await validateFile(body.file),current=await snapshot();
 if(body.mode==='preview'){const payload={purpose:'restore',fileSignature:file.signature,revision:current.revision,userId:actor.id,expiresAt:Date.now()+10*60*1000};return Response.json({summary:summary(current,file.payload),token:{payload,signature:await sign(payload)}})}
 const parsed=tokenSchema.safeParse(body.token);if(!parsed.success)throw new AccessError('Analise o arquivo antes de confirmar a recuperação.',400);
 const {payload,signature}=parsed.data;
 if(!await verify(payload,signature)||payload.userId!==actor.id||payload.fileSignature!==file.signature||payload.expiresAt<Date.now())throw new AccessError('A conferência expirou ou não corresponde a este arquivo. Analise novamente.',409);
 if(payload.revision!==current.revision)throw new AccessError('Os dados mudaram depois da conferência. Analise novamente.',409);
 const safety=await storeBackup(await envelope(current),actor,'before-restore');await restore(file.payload,current,safety,actor);
 return Response.json({ok:true,safetyBackupId:safety.id,lines:file.payload.lines.length});
 }catch(e){return failure(e)}}
