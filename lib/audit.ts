import {type Line,type Config,type Device,displayNumber,currency,statusLabels,usageLabels} from './atlas';
import {deviceSlots,locationOf} from './registration';
export type AuditActor={id:string;name:string;email:string};
export type Values=Record<string,string>;
export type AuditDetail={kind:'created'|'updated'|'device'|'restored';actor:AuditActor;before?:Values|null;after?:Values;beforeDevice?:Values;afterDevice?:Values};
export type HistoryEvent={id:string;date:string;kind:string;actor:AuditActor|null;changes:{field:string;before:string;after:string}[];legacy:boolean;incomplete:boolean};
export function deviceValues(d:Device):Values{return {'Nome do aparelho':d.name,'Modelo do aparelho':d.model,'Sistema do aparelho':d.type==='iphone'?'iPhone / iOS':'Android','Local do aparelho':d.location,'Responsável pelo aparelho':d.owner,'Slots do aparelho':deviceSlots(d).join(', ')}}
export function lineValues(l:Line,c:Config):Values{
 const device=c.devices.find(d=>d.id===l.deviceId);
 return {'Número':displayNumber(l.number),'Identificação':l.name,'Operadora':l.carrier,'Uso do número':usageLabels[l.usage],'Sistema / uso virtual':l.platform,'Situação':statusLabels[l.status],'Aparelho':device?`${device.name} · ${device.model}`:l.deviceId||'','Slot / eSIM':l.slot||'','Localização do chip':locationOf(l,c),'Local guardado no cadastro':l.location,'Responsável':l.owner,'Setor':l.team,'Mensalidade':currency(l.cost),'Dia de vencimento':l.dueDay?String(l.dueDay):'','Observação':l.notes,...(device?deviceValues(device):{})};
}
export function diffValues(before:Values|null,after:Values){return [...new Set([...Object.keys(before||{}),...Object.keys(after)])].filter(key=>before===null||before[key]!==after[key]).map(field=>({field,before:before===null?'Não se aplica':before[field]||'Não informado',after:after[field]||'Não informado'}))}
export function lineDetail(before:Line|null,after:Line,c:Config,actor:AuditActor):AuditDetail{
 const previous=before?lineValues(before,c):null,next=lineValues(after,c);
 // Keep a device swap visible even when two devices happen to share a name/model.
 if(before&&before.deviceId!==after.deviceId&&previous?.Aparelho===next.Aparelho){previous['Referência do aparelho']=before.deviceId||'';next['Referência do aparelho']=after.deviceId||''}
 return {kind:before?'updated':'created',actor,before:previous,after:next};
}
export function legacyValues(l:Line):Values{
 return {'Número':displayNumber(l.number),'Identificação':l.name,'Operadora':l.carrier,'Uso do número':usageLabels[l.usage],'Sistema / uso virtual':l.platform,'Situação':statusLabels[l.status],'Referência do aparelho':l.deviceId||'','Slot / eSIM':l.slot||'','Local guardado no cadastro':l.location,'Responsável':l.owner,'Setor':l.team,'Mensalidade':currency(l.cost),'Dia de vencimento':l.dueDay?String(l.dueDay):'','Observação':l.notes};
}
export function historyEvent(row:{id:string;created_at:string;detail:string|null;data:string;version:number;previous:string|null}):HistoryEvent{
 if(row.detail){const d=JSON.parse(row.detail) as AuditDetail;return {id:row.id,date:row.created_at,kind:d.kind,actor:d.actor,changes:diffValues(d.kind==='device'?d.beforeDevice||{}:d.before||null,d.kind==='device'?d.afterDevice||{}:d.after||{}),legacy:false,incomplete:false}}
 const before=row.previous?legacyValues(JSON.parse(row.previous)):null;
 return {id:row.id,date:row.created_at,kind:row.version===1?'created':'updated',actor:null,changes:diffValues(before,legacyValues(JSON.parse(row.data))),legacy:true,incomplete:row.version!==1&&!before};
}
