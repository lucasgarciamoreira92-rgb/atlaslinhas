import {z} from 'zod';
import {requireActor,AccessError} from '@/lib/access';
import {sessionIdentity} from './auth';
import {assistantConnectionStatus,requestAssistant,setAssistantConfiguration} from './openai-connection';
import {readAssistantConfig} from './assistant-config';
setAssistantConfiguration(readAssistantConfig);
const limits=new Map<string,{at:number;count:number;busy:boolean}>();
export async function assistantGET(){await requireActor(true);return Response.json(assistantConnectionStatus());}
export async function assistantPOST(req:Request){
 const actor=await requireActor(true);
 if(!assistantConnectionStatus().configured)throw new AccessError('A conexão OpenAI ainda precisa ser configurada no servidor.',503);
 const {messages}=z.object({messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().min(1).max(4000)}).strict()).min(1).max(30)}).strict().parse(await req.json());
 if(messages.reduce((n,m)=>n+m.content.length,0)>20000)throw new AccessError('Conversa muito longa. Inicie uma nova conversa.',400);
 const now=Date.now();for(const [id,item] of limits)if(!item.busy&&now-item.at>60000)limits.delete(id);
 const limit=limits.get(actor.id)||{at:now,count:0,busy:false};
 if(limit.busy||limit.count>=10)throw new AccessError('Aguarde a resposta atual ou tente novamente em um minuto.',429);
 limits.set(actor.id,limit);limit.count++;limit.busy=true;
 try{const reply=await requestAssistant(messages);if(sessionIdentity(req)?.userId!==actor.id)throw new AccessError('Sua sessão expirou. Entre novamente.',401);await requireActor(true);return Response.json({reply});}
 catch(e){if(e instanceof AccessError)throw e;throw new AccessError(e instanceof Error?e.message:'Falha na conexão com a IA.',502);}
 finally{limit.busy=false;}
}
