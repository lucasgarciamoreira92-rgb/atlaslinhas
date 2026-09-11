import {lineSchema,configSchema,slotOptions,type Device,type Config,type Line} from './atlas';

// Older devices keep their previously available bindings until reviewed.
export const deviceSlots=(device:Device)=>device.slots??[...slotOptions];
export const locationOf=(line:Line,config:Config)=>line.deviceId?config.devices.find(d=>d.id===line.deviceId)?.location||'':line.location;
export function parseCost(input:string):number|null {
  const value=input.trim().replace(/^R\$\s*/,'');
  if(!value)return null;
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)&&!/^\d+\.\d{1,2}$/.test(value))throw new Error('Informe um valor como 49,90 ou 1.249,90.');
  const normalized=value.includes(',')?value.replace(/\./g,'').replace(',','.'): /^\d{1,3}(?:\.\d{3})+$/.test(value)?value.replace(/\./g,''):value;
  const cents=Math.round(Number(normalized)*100);
  if(cents>100000000)throw new Error('A mensalidade deve ser de até R$ 1.000.000,00.');
  return cents;
}
export function prepareLine(input:Line,config:Config):Line {
  const parsed=lineSchema.safeParse(input);
  if(!parsed.success)throw new Error(parsed.error.issues[0].message);
  const line=parsed.data;
  if(line.status==='cancelled')return {...line,location:locationOf(line,config),deviceId:null,slot:null};
  if(!line.deviceId)return {...line,slot:null};
  const device=config.devices.find(d=>d.id===line.deviceId);
  if(!device)throw new Error('Escolha um aparelho cadastrado.');
  if(!line.slot||!deviceSlots(device).includes(line.slot))throw new Error('Escolha um slot disponível nesse aparelho.');
  return line;
}
export function checkLineConflicts(line:Line,lines:Line[]) {
  if(lines.some(other=>other.id!==line.id&&other.number===line.number))throw new Error('Este número já está cadastrado. Abra o cadastro existente para editar ou reativar.');
  if(line.deviceId&&lines.some(other=>other.id!==line.id&&other.deviceId===line.deviceId&&other.slot===line.slot))throw new Error('Esse slot já está ocupado por outra linha.');
}
export function prepareConfig(input:Config,lines:Line[]):Config {
  const parsed=configSchema.safeParse(input);
  if(!parsed.success)throw new Error(parsed.error.issues[0].message);
  const config=parsed.data;
  if(new Set(config.devices.map(d=>d.id)).size!==config.devices.length)throw new Error('Aparelhos duplicados.');
  for(const line of lines){
    if(!line.deviceId)continue;
    const device=config.devices.find(d=>d.id===line.deviceId);
    if(!device)throw new Error('Um aparelho vinculado a uma linha não pode ser removido.');
    if(line.slot&&!deviceSlots(device).includes(line.slot))throw new Error(`O ${line.slot} de ${device.name} está ocupado. Mova a linha antes de remover esse slot.`);
  }
  return config;
}
export function sameLine(a:Line,b:Line){
  const {id:ai,version:av,updatedAt:at,...left}=a;
  const {id:bi,version:bv,updatedAt:bt,...right}=b;
  return Object.keys(left).every(key=>left[key as keyof typeof left]===right[key as keyof typeof right])&&Object.keys(left).length===Object.keys(right).length;
}
