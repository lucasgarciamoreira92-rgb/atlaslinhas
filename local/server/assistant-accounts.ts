import {z} from 'zod';
import {AccessError,requireActor} from '@/lib/access';
import {accountDataSchema,defaultPolicy,newAccount,type AccountData} from '@/lib/accounts';
import {inventory,people,validateData} from './access-service';
import {sqlite} from './environment';
import {beginReview,finishReview} from './assistant-approval';
const rows=()=>sqlite.prepare('SELECT id,data,version FROM access_accounts ORDER BY id').all().map(r=>({id:String(r.id),version:Number(r.version),data:JSON.parse(String(r.data)) as AccountData}));
const revision=()=>Number(sqlite.prepare("SELECT revision FROM storage_revision WHERE id='main'").get()?.revision??0);
const fieldsSchema=accountDataSchema.omit({checkedAt:true,checkedBy:true}).partial().strict();
export async function assistantAccountsGET(){
 await requireActor(true);const current=inventory();
 return Response.json({revision:revision(),accounts:rows().map(r=>({id:r.id,version:r.version,...r.data})),people:people(),
  devices:current.config.devices.map(d=>({id:d.id,name:d.name,model:d.model})),lines:current.lines.map(l=>({id:l.id,name:l.name,number:l.number,deviceId:l.deviceId})),
 },{headers:{'Cache-Control':'no-store'}});
}
export async function assistantAccountProposalPOST(req:Request){
 await requireActor(true);const review=beginReview(req);
 const input=z.object({action:z.enum(['create','edit']),targetId:z.string().min(1).max(100).optional(),expectedVersion:z.number().int().positive().optional(),revision:z.number().int().nonnegative(),fields:fieldsSchema}).strict().parse(await req.json());
 if(input.revision!==revision())throw new AccessError('Os cadastros ou vínculos mudaram. Consulte novamente antes de revisar.',409);
 const all=rows(),previous=input.targetId?all.find(a=>a.id===input.targetId):undefined;
 if(input.action==='create'&&(input.targetId||input.expectedVersion))throw new AccessError('Um cadastro novo não deve indicar conta existente.',400);
 if(input.action==='edit'&&(!previous||previous.version!==input.expectedVersion))throw new AccessError('Selecione a conta e sua versão atual antes de editar.',409);
 const combined={...(previous?.data??newAccount(null)),...input.fields};
 const questions=['service','label','login'].filter(f=>!combined[f as keyof typeof combined]).map(field=>({field,question:({service:'Qual é o serviço?',label:'Como deseja identificar a conta?',login:'Qual é o login ou e-mail da conta?'} as Record<string,string>)[field]}));
 if(questions.length)return Response.json({state:'needs_information',questions});
 const after=accountDataSchema.parse({...combined,checkedAt:null,checkedBy:null});
 const inv=inventory();validateData(after,previous?.id??'new-account',all,inv.config,inv.lines,new Set(people().map(p=>p.id)));
 if(all.some(a=>a.id!==previous?.id&&a.data.service.toLowerCase()===after.service.toLowerCase()&&a.data.login.toLowerCase()===after.login.toLowerCase()))throw new AccessError('Este serviço e login já estão cadastrados.',409);
 const changes=Object.entries(after).filter(([key,value])=>!['checkedAt','checkedBy'].includes(key)&&JSON.stringify(previous?.data[key as keyof AccountData]??null)!==JSON.stringify(value)).map(([field,value])=>({field,before:previous?.data[field as keyof AccountData]??null,after:value}));
 if(!changes.length)return Response.json({state:'unchanged',before:previous?.data,after,changes});
 const policy={...defaultPolicy,visibility:'selected',quickAccess:false};
 const approval=finishReview(req,review,{kind:'account',settingsVersion:input.revision,payload:{action:'save',...(previous?{id:previous.id}:{}),version:previous?.version??0,data:after,...(!previous?{policy}:{})}});
 return Response.json({state:'ready_for_review',before:previous?.data??null,after,changes,...approval,
  permissions:previous?'Permissões atuais preservadas.':'Nova conta visível somente a administradores, sem consulta rápida do Cofre.',
 });
}
