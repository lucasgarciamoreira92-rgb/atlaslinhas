import {z} from 'zod';
import type {Config,Line} from './atlas';
const id=z.string().min(1).max(100), nullableId=id.nullable();
const text=z.string().trim().max(200);
export const methodLabels={sms:'SMS',call:'Ligação',email:'E-mail',authenticator:'Aplicativo autenticador',prompt:'Aprovação no aparelho',passkey:'Chave de acesso (passkey)',key:'Chave física',recovery:'Códigos de recuperação',other:'Outro método'} as const;
export const mfaLabels={enabled:'Ativada',disabled:'Desativada',unknown:'Não conferida',unsupported:'Serviço não oferece'} as const;
export const destinationSchema=z.object({id,lineId:nullableId,deviceId:nullableId,accountId:nullableId,personId:nullableId,description:z.string().trim().max(500),state:z.enum(['available','unknown','unavailable'])}).strict();
export const methodSchema=z.object({id,type:z.enum(['sms','call','email','authenticator','prompt','passkey','key','recovery','other']),purpose:z.enum(['access','recovery','both']),stage:z.number().int().min(1).max(10),preferred:z.boolean(),instruction:z.string().trim().max(1000),destinations:z.array(destinationSchema).min(1).max(30)}).strict();
export const accountDataSchema=z.object({service:text.min(1,'Informe o serviço.'),label:text.min(1,'Informe o nome da conta.'),login:text.min(1,'Informe o login ou e-mail.'),kind:z.enum(['service','email']),ownerId:nullableId,sector:text,mfa:z.enum(['enabled','disabled','unknown','unsupported']),archived:z.boolean(),methods:z.array(methodSchema).max(40),checkedAt:z.string().datetime().nullable(),checkedBy:nullableId}).strict();
export const accountPolicySchema=z.object({visibility:z.enum(['team','selected']),viewers:z.array(id).max(200),revealUsers:z.array(id).max(200),editUsers:z.array(id).max(200),quickAccess:z.boolean(),sensitive:z.boolean()}).strict();
export const defaultPolicy:AccountPolicy={visibility:'team',viewers:[],revealUsers:[],editUsers:[],quickAccess:true,sensitive:false};
export type AccountData=z.infer<typeof accountDataSchema>;
export type AccountPolicy=z.infer<typeof accountPolicySchema>;
export type VerificationMethod=z.infer<typeof methodSchema>;
export type Destination=z.infer<typeof destinationSchema>;
export type AccessPerson={id:string;name:string;userId:string|null};
export type AccessAccount=AccountData&{id:string;version:number;credentialVersion:number;hasSecret:boolean;canReveal:boolean;canEdit:boolean;quickAccess:boolean;sensitive:boolean;policy?:AccountPolicy};
export type AccessReport={id:string;accountId:string;destinationId:string|null;reason:string;status:'open'|'resolved';createdAt:string;author:string;resolvedAt:string|null;resolvedBy:string|null};
export type AccessEvent={id:string;accountId:string|null;action:string;createdAt:string;actor:string;detail:Record<string,unknown>};
export type AccessDirectory={accounts:AccessAccount[];people:AccessPerson[];users:{id:string;name:string;active:boolean}[];canManage:boolean;reports:AccessReport[]};
export function newAccount(ownerId:string|null):AccountData{return {service:'',label:'',login:'',kind:'service',ownerId,sector:'',mfa:'unknown',archived:false,methods:[],checkedAt:null,checkedBy:null}}
export function destinationInfo(t:Destination,config:Config,lines:Line[],accounts:AccessAccount[],people:AccessPerson[]){
 const line=lines.find(l=>l.id===t.lineId),device=config.devices.find(d=>d.id===(line?line.deviceId:t.deviceId)),mail=accounts.find(a=>a.id===t.accountId),person=people.find(p=>p.id===t.personId);
 const missing=Boolean(t.lineId&&!line||t.deviceId&&!device||t.accountId&&!mail);
 return {label:line?.number||mail?.login||device?.name||(t.accountId?'Conta restrita ou indisponível':t.description||'Destino a conferir'),device,owner:person?.name||line?.owner||device?.owner||'',line,mail,missing,unavailable:t.state==='unavailable'||line?.status==='cancelled'||line?.status==='suspended'||Boolean(mail?.archived)};
}
export function accountAttention(a:AccessAccount,config:Config,lines:Line[],accounts:AccessAccount[],people:AccessPerson[]){
 const pending:string[]=[],protection:string[]=[];const access=a.methods.filter(m=>m.purpose!=='recovery');
 if(!a.ownerId)pending.push('Sem responsável');if(!a.methods.length)pending.push('Sem método cadastrado');if(!a.checkedAt)pending.push('Cadastro não conferido');
 if(a.mfa==='disabled')protection.push('2FA desativada');if(a.mfa==='unknown')protection.push('Proteção não conferida');if(a.mfa==='unsupported')protection.push('Serviço não oferece 2FA');
 if(!a.methods.some(m=>m.purpose!=='access'))pending.push('Sem recuperação cadastrada');
 const recoveryEdges=(id:string)=>accounts.find(item=>item.id===id)?.methods.filter(m=>m.purpose!=='access').flatMap(m=>m.destinations.flatMap(t=>t.accountId?[t.accountId]:[]))||[];
 const hasCycle=(id:string,visited:Set<string>):boolean=>recoveryEdges(id).some(next=>next===a.id||!visited.has(next)&&hasCycle(next,new Set([...visited,next])));
 if(hasCycle(a.id,new Set([a.id])))pending.push('Dependência circular na recuperação');
 const stages=[...new Set(access.map(m=>m.stage))];
 const blocked=stages.some(stage=>access.filter(m=>m.stage===stage).every(m=>m.destinations.every(t=>destinationInfo(t,config,lines,accounts,people).unavailable)));
 for(const m of a.methods)for(const t of m.destinations){const d=destinationInfo(t,config,lines,accounts,people);if(d.missing||t.state==='unknown')pending.push('Destino precisa de conferência');if(d.unavailable)pending.push('Método sem acesso');if(!d.owner&&!t.personId)pending.push('Destino sem responsável');}
 return {blocked,pending:[...new Set(pending)],protection};
}
export const accessSnapshotSchema=z.object({schema:z.literal(1),people:z.array(z.object({id,name:text.min(1)})).max(2000),accounts:z.array(z.object({id,version:z.number().int().positive(),data:accountDataSchema,policy:accountPolicySchema,secret:z.string().max(300000).nullable(),secretVersion:z.number().int().nonnegative(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()})).max(10000),reports:z.array(z.object({id,accountId:id,destinationId:nullableId,reason:z.string().max(1000),status:z.enum(['open','resolved']),createdAt:z.string().datetime(),author:z.string().max(300),resolvedAt:z.string().datetime().nullable(),resolvedBy:z.string().max(300).nullable()})).max(100000),history:z.array(z.object({id,accountId:nullableId,action:z.string().max(100),createdAt:z.string().datetime(),actor:z.string().max(300),detail:z.string().max(100000)})).max(100000)}).strict();
export type AccessSnapshot=z.infer<typeof accessSnapshotSchema>;
