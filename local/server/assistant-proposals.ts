import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {AccessError,requireActor} from '@/lib/access';
import {config,db} from '@/lib/storage';
import {lineSchema,deviceSchema,type Line} from '@/lib/atlas';
import {prepareLine,prepareConfig,checkLineConflicts,deviceSlots} from '@/lib/registration';

// Stateless preparation only. A proposal is never an authorization to save.
const lineFields=lineSchema.omit({id:true,version:true,updatedAt:true,notes:true}).partial().strict();
const deviceFields=deviceSchema.omit({id:true}).partial().strict();
const envelope=z.object({kind:z.enum(['line','device']),action:z.enum(['create','edit']),
 targetId:z.string().min(1).max(100).optional(),expectedVersion:z.number().int().nonnegative().optional(),
 settingsVersion:z.number().int().nonnegative(),fields:z.record(z.unknown()),
}).strict();
const prompts:Record<string,string>={number:'Qual é o número com DDD?',name:'Como deseja identificar este cadastro?',carrier:'Qual é a operadora?',usage:'Qual é a finalidade da linha?',status:'Qual é a situação da linha?',deviceId:'Em qual aparelho ficará? Você também pode informar que está sem aparelho.',slot:'Qual slot ou eSIM será utilizado?',type:'O aparelho é iPhone ou Android?',model:'Qual é o modelo do aparelho?'};
const publicLine=(l:Line)=>{const {notes,updatedAt,...safe}=l;return {...safe,dataPackage:l.dataPackage??''};};

export async function assistantProposalPOST(req:Request){
 await requireActor(true);
 const input=envelope.parse(await req.json());
 const fields=(input.kind==='line'?lineFields:deviceFields).parse(input.fields);
 if(input.action==='create'&&(input.targetId!==undefined||input.expectedVersion!==undefined))throw new AccessError('Um cadastro novo não deve indicar registro ou versão anterior.',400);
 if(input.action==='edit'&&(!input.targetId||input.expectedVersion===undefined))throw new AccessError('Selecione o cadastro e a versão antes de preparar a edição.',400);
 const c=await config();
 if(c.version!==input.settingsVersion)throw new AccessError('Os aparelhos ou configurações mudaram. Consulte novamente antes de preparar a proposta.',409);
 const rows=await db().prepare('SELECT id,data,version FROM lines ORDER BY id').all<{id:string;data:string;version:number}>();
 const lines=rows.results.map(r=>({...JSON.parse(r.data),id:r.id,version:r.version}) as Line);
 const existing=input.kind==='line'?lines.find(l=>l.id===input.targetId):c.devices.find(d=>d.id===input.targetId);
 if(input.action==='edit'&&!existing)throw new AccessError('Cadastro não encontrado. Consulte novamente.',404);
 if(input.action==='edit'&&input.expectedVersion!==(input.kind==='line'?(existing as Line).version:c.version))throw new AccessError('O cadastro mudou. Consulte a versão atual antes de editar.',409);
 const before=input.action==='edit'?(input.kind==='line'?publicLine(existing as Line):existing):null;
 const required=input.kind==='line'?['number','name','carrier','usage','status','deviceId']:['name','type','model'];
 const combined={...(before??{}),...fields} as Record<string,unknown>;
 const missing=required.filter(key=>combined[key]===undefined||combined[key]==='');
 if(input.kind==='line'&&combined.deviceId&&combined.status!=='cancelled'&&!combined.slot)missing.push('slot');
 const base={kind:input.kind,action:input.action,targetId:input.targetId??null,settingsVersion:c.version,expectedVersion:input.expectedVersion??null,canSave:false};
 if(missing.length)return Response.json({...base,state:'needs_information',questions:missing.map(field=>({field,question:prompts[field]}))});
 let after:Record<string,unknown>,affectedLineIds:string[]=[];
 try{
  if(input.kind==='line'){
   const candidate=prepareLine({platform:'',location:'',owner:'',team:'',cost:null,dueDay:null,dataPackage:'',notes:'',slot:null,version:0,...(input.action==='edit'?existing:{}),...fields} as Line,c);
   checkLineConflicts(candidate,lines);
   if(!c.carriers.includes(candidate.carrier))throw Error('Escolha uma operadora cadastrada.');
   after=publicLine(candidate);
  }else{
   const candidate=deviceSchema.parse(Object.assign({id:input.targetId??randomUUID(),location:'',owner:''},before??{},fields));
   const devices=input.action==='edit'?c.devices.map(d=>d.id===candidate.id?candidate:d):[...c.devices,candidate];
   prepareConfig({...c,devices},lines);
   after={...candidate,slots:deviceSlots(candidate)};
   affectedLineIds=lines.filter(l=>l.deviceId===candidate.id).map(l=>l.id!);
  }
 }catch(e){return Response.json({...base,state:'invalid',error:e instanceof Error?e.message:'Revise os dados.'});}
 const keys=Object.keys(after).filter(k=>!['id','version'].includes(k));
 const changes=keys.filter(k=>JSON.stringify((before as Record<string,unknown>|null)?.[k]??null)!==JSON.stringify(after[k]??null))
  .map(field=>({field,before:(before as Record<string,unknown>|null)?.[field]??null,after:after[field]??null}));
 await requireActor(true);
 return Response.json({...base,state:input.action==='edit'&&!changes.length?'unchanged':'ready_for_review',
  before,after,changes,affectedLineIds,requiresApproval:true,
  message:'Revise a proposta. Nenhum cadastro foi salvo; a confirmação de gravação será implementada em uma etapa posterior.'});
}
