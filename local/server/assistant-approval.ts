import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {requireActor,AccessError} from '@/lib/access';
import {sessionHash,sessionIdentity} from './auth';
import {saveLine} from '@/app/api/lines/route';
import {saveSettings} from '@/app/api/settings/route';
import {saveAccess} from './access-service';

type Review={revision:string;expiresAt:number;token?:string;kind?:'line'|'device'|'account';payload?:unknown;settingsVersion?:number;lines?:string};
const reviews=new Map<string,Review>();
export function beginReview(req:Request){
 for(const [key,value] of reviews)if(value.expiresAt<Date.now())reviews.delete(key);
 const key=sessionHash(req);if(!reviews.has(key)&&reviews.size>=500)throw new AccessError('Muitas revisões abertas. Tente novamente mais tarde.',429);
 const review:Review={revision:randomUUID(),expiresAt:Date.now()+10*60*1000};reviews.set(key,review);return review;
}
export function finishReview(req:Request,review:Review,content:Pick<Review,'kind'|'payload'|'settingsVersion'|'lines'>){
 if(reviews.get(sessionHash(req))!==review)throw new AccessError('Há uma proposta mais recente. Revise o resumo atual.',409);
 Object.assign(review,content,{token:randomUUID()});return {approvalToken:review.token,expiresAt:review.expiresAt};
}
export async function assistantApprovePOST(req:Request){
 const actor=await requireActor(true);
 const {approvalToken,confirmed}=z.object({approvalToken:z.string().uuid(),confirmed:z.literal(true)}).strict().parse(await req.json());
 const key=sessionHash(req),review=reviews.get(key);
 if(!confirmed||!review||review.token!==approvalToken||review.expiresAt<Date.now())throw new AccessError('Esta proposta expirou, foi substituída ou já foi utilizada. Prepare um novo resumo.',409);
 if(sessionIdentity(req)?.userId!==actor.id)throw new AccessError('Sua sessão expirou.',401);
 // Consume before any await: concurrent or repeated clicks cannot write twice.
 reviews.delete(key);
 const write=new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(review.payload)});
 const response=review.kind==='account'?await saveAccess(write,review.settingsVersion):review.kind==='line'?await saveLine(write,review.settingsVersion):await saveSettings(write,review.lines);
 if(!response.ok)return response;
 const result=await response.json() as {account?:{id:string;version:number};line?:{id:string;version:number};config?:{version:number}};
 return Response.json({saved:true,kind:review.kind,id:result.account?.id??result.line?.id??null,version:result.account?.version??result.line?.version??result.config?.version,message:'Cadastro salvo após sua aprovação.'});
}
