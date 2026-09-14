import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {requireActor,AccessError} from '@/lib/access';
import {sessionHash,sessionIdentity} from './auth';
import {readAssistantConfig} from './assistant-config';
import {assistantCatalogGET} from './assistant-catalog';
import {assistantAccountsGET,assistantAccountProposalPOST} from './assistant-accounts';
import {assistantProposalPOST} from './assistant-proposals';
import {beginReview} from './assistant-approval';
import {runConversation,type ConversationItem,type ToolResult} from './assistant-conversation-engine';
const sessions=new Map<string,{id:string;history:ConversationItem[];expires:number}>();
const limits=new Map<string,{at:number;count:number;busy:boolean}>();
export async function conversationPOST(req:Request){
 const actor=await requireActor(true),key=sessionHash(req),now=Date.now();
 const input=z.discriminatedUnion('action',[
  z.object({action:z.literal('reset')}).strict(),
  z.object({action:z.literal('message'),message:z.string().trim().min(1).max(4000),conversationId:z.string().uuid().nullable()}).strict()
 ]).parse(await req.json());
 for(const [k,s] of sessions)if(s.expires<now)sessions.delete(k);
 for(const [k,l] of limits)if(!l.busy&&now-l.at>60000)limits.delete(k);
 const limit=limits.get(actor.id)??{at:now,count:0,busy:false};
 if(limit.busy)throw new AccessError('Aguarde a resposta atual.',429);
 if(input.action==='reset'){sessions.delete(key);beginReview(req);return Response.json({reset:true});}
 if(limit.count>=10)throw new AccessError('Limite de mensagens atingido. Aguarde um minuto.',429);
 const configuration=readAssistantConfig();if(!configuration.apiKey||!configuration.model)throw new AccessError('Configure a OpenAI para conversar com a IA.',503);
 let state=sessions.get(key);
 if(input.conversationId&&(!state||state.id!==input.conversationId))throw new AccessError('A conversa expirou. Inicie uma nova conversa.',409);
 if(!input.conversationId){if(!sessions.has(key)&&sessions.size>=500)throw new AccessError('Muitas conversas abertas. Tente mais tarde.',429);state={id:randomUUID(),history:[],expires:now+1800000};sessions.set(key,state);}
 const current=state!;beginReview(req);limits.set(actor.id,limit);limit.count++;limit.busy=true;
 const child=(body:unknown)=>new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(body)});
 const execute=async(name:string,payload:unknown):Promise<ToolResult>=>{
  if(sessionIdentity(req)?.userId!==actor.id)throw new AccessError('Sua sessão expirou.',401);await requireActor(true);
  if(name==='abrir_cofre'){z.object({}).strict().parse(payload);return {data:{protectedPanel:true},terminal:true,openVault:true};}
  if(name==='consultar_linhas_aparelhos'){
   const d=z.object({kind:z.enum(['lines','devices']),query:z.string().max(200),offset:z.number().int().min(0).max(100000),limit:z.number().int().min(1).max(20)}).strict().parse(payload);
   const url=new URL('/api/assistant/catalog',req.url);for(const [k,v] of Object.entries(d))url.searchParams.set(k,String(v));return {data:await (await assistantCatalogGET(new Request(url,{headers:req.headers}))).json()};
  }
  if(name==='consultar_contas'){
   const d=z.object({query:z.string().max(200),offset:z.number().int().min(0).max(100000)}).strict().parse(payload);
   const directory=await (await assistantAccountsGET()).json() as {accounts:Record<string,unknown>[];revision:number;people:{id:string;name:string}[];devices:{id:string;name:string}[];lines:{id:string;name:string}[]};const q=d.query.toLocaleLowerCase();const matches=directory.accounts.filter((a:Record<string,unknown>)=>[a.id,a.service,a.label,a.login].join(' ').toLocaleLowerCase().includes(q));
   return {data:{...directory,accounts:matches.slice(d.offset,d.offset+10),total:matches.length,nextOffset:d.offset+10<matches.length?d.offset+10:null}};
  }
  let response:Response;
  if(name==='preparar_linha_aparelho')response=await assistantProposalPOST(child(payload));
  else if(name==='preparar_conta')response=await assistantAccountProposalPOST(child(payload));
  else throw new AccessError('Operação não permitida.',400);
  const review=await response.json() as Record<string,unknown>;if(!response.ok)throw new AccessError('Revise os dados da proposta.',400);
  const {approvalToken,expiresAt,...safe}=review;
  const refs=await (await assistantAccountsGET()).json() as {accounts:{id:string;label:string}[];people:{id:string;name:string}[];devices:{id:string;name:string}[];lines:{id:string;name:string}[]};
  review.referenceLabels=Object.fromEntries([...refs.accounts.map(a=>[a.id,a.label]),...refs.people.map(a=>[a.id,a.name]),...refs.devices.map(a=>[a.id,a.name]),...refs.lines.map(a=>[a.id,a.name])]);
  const subject=(review.before??review.after??{}) as Record<string,unknown>;review.subject=[subject.name??subject.label,subject.number??subject.login].filter(Boolean).join(' · ');
  return {data:safe,terminal:true,review};
 };
 try{const result=await runConversation([...current.history,{role:'user',content:input.message}],configuration,execute);if(sessionIdentity(req)?.userId!==actor.id)throw new AccessError('Sua sessão expirou.',401);await requireActor(true);current.history=result.history;current.expires=Date.now()+1800000;return Response.json({conversationId:current.id,reply:result.reply,review:result.review,openVault:result.openVault},{headers:{'Cache-Control':'no-store'}});}
 catch(e){beginReview(req);if(e instanceof AccessError)throw e;if(e instanceof z.ZodError)throw new AccessError('A IA propôs dados inválidos. Corrija o pedido; nada foi salvo.',400);throw new AccessError(e instanceof Error?e.message:'Falha na conversa.',502);}
 finally{limit.busy=false;}
}
