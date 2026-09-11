import {z} from 'zod';
const word=z.string().trim().max(200);
export const slotOptions=['Slot 1','Slot 2','eSIM'] as const;
export const slotSchema=z.union([z.enum(slotOptions),z.string().regex(/^eSIM ([2-9]|[1-9][0-9])$/,'Identificação de eSIM inválida.')]);
export const normalizeNumber=(value:string)=>{const digits=value.replace(/[\s()+.\-]/g,'');return digits.length===13&&digits.startsWith('55')?digits.slice(2):digits};
export const deviceSchema=z.object({id:z.string().min(1).max(100),name:word.min(1),type:z.enum(['iphone','android']),model:word.min(1),location:word,owner:word,slots:z.array(slotSchema).min(1,'Selecione ao menos um slot.').max(101).refine(v=>new Set(v).size===v.length,'Slots duplicados.').optional()});
export const configSchema=z.object({company:word.min(1),carriers:z.array(word.min(1)).min(1,'Cadastre ao menos uma operadora.').max(100),locations:z.array(word.min(1)).max(100),devices:z.array(deviceSchema).max(300),version:z.number().int().nonnegative()});
export function formatDataPackage(value:string|undefined){const text=(value??'').trim();const match=text.match(/^(\d+(?:[.,]\d+)?)\s*(?:GB)?$/i);return match?match[1].replace('.',',')+' GB':text}
export const lineSchema=z.object({id:z.string().max(100).optional(),number:z.string().transform(normalizeNumber).pipe(z.string().regex(/^[1-9][0-9]9[0-9]{8}$/,'Informe DDD e um celular com 9 dígitos, começando por 9.')),name:word.min(1,'Informe uma identificação.'),carrier:word.min(1,'Escolha a operadora.'),usage:z.enum(['api','groups','phone','other']),platform:word,status:z.enum(['active','reserve','suspended','cancelled']),deviceId:z.string().max(100).nullable(),slot:slotSchema.nullable(),location:word,owner:word,team:word,dataPackage:z.string().trim().max(100,'Use até 100 caracteres para o pacote de dados.').transform(formatDataPackage).optional(),cost:z.number().int().nonnegative().max(100000000).nullable(),dueDay:z.number().int().min(1).max(31).nullable(),notes:z.string().trim().max(2000),version:z.number().int().nonnegative(),updatedAt:z.string().optional()});
export type Device=z.infer<typeof deviceSchema>;
export type Config=z.infer<typeof configSchema>;
export type Line=z.infer<typeof lineSchema>;
export const defaultConfig:Config={company:'ON NET',carriers:['Vivo','Claro','TIM'],locations:['Sede','Operacional','Comercial','Armário da TI'],devices:[],version:0};
export const usageLabels={api:'API oficial',groups:'Grupos de WhatsApp',phone:'Ligações / WhatsApp',other:'Outro uso'};
export const statusLabels={active:'Em uso',reserve:'Em reserva',suspended:'Suspensa',cancelled:'Cancelada'};
export const modelOptions={iphone:['iPhone 13','iPhone 14','iPhone 15'],android:['Samsung Galaxy A15','Motorola Moto G54','Xiaomi Redmi Note 13']};
export const displayNumber=(n:string)=>n.length===11?`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`:n;
export const currency=(c:number|null)=>c===null?'Não informado':(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function newLine():Line{return {number:'',name:'',carrier:'',usage:'phone',platform:'',status:'active',deviceId:null,slot:null,location:'',owner:'',team:'',dataPackage:'',cost:null,dueDay:null,notes:'',version:0}}
export const demoConfig:Config={...defaultConfig,devices:[{id:'d1',name:'Operacional 01',type:'android',model:'Samsung Galaxy A15',location:'Sede · Operacional',owner:'Bruno'},{id:'d2',name:'Plantão 01',type:'android',model:'Motorola Moto G54',location:'Sede · Suporte',owner:'Diego'},{id:'d3',name:'Comercial 01',type:'iphone',model:'iPhone 13',location:'Sala do comercial',owner:'Fábio'},{id:'d4',name:'Instalação 02',type:'android',model:'Samsung Galaxy A15',location:'',owner:'Gustavo'}]};
export const demoLines:Line[]=[
{name:'Atendimento principal',carrier:'Vivo',usage:'api',platform:'Atlas / WhatsApp API',location:'Armário TI · Caixa 01',owner:'Ana',team:'Comercial',cost:3990},
{name:'Equipes de campo',carrier:'Claro',usage:'groups',platform:'Atlas Groups',deviceId:'d1',slot:'Slot 1',owner:'Bruno',team:'Operações',cost:4990},
{name:'Vendas',carrier:'TIM',usage:'api',platform:'Atlas / WhatsApp API',location:'Armário TI · Caixa 02',owner:'Carla',team:'Comercial',cost:3990},
{name:'Plantão técnico',carrier:'Vivo',deviceId:'d2',slot:'Slot 1',owner:'Diego',team:'Suporte',cost:4990},
{name:'Gestão interna',carrier:'Claro',usage:'groups',platform:'WhatsApp',deviceId:'d1',slot:'Slot 2',owner:'Bruno',team:'Operações',cost:2990},
{name:'Financeiro',carrier:'TIM',usage:'api',platform:'Atlas / WhatsApp API',location:'Armário TI · Caixa 03',owner:'Elisa',team:'Financeiro',cost:3990},
{name:'Visitas comerciais',carrier:'Vivo',deviceId:'d3',slot:'eSIM',owner:'Fábio',team:'Vendas',cost:5990},
{name:'Equipe de instalação',carrier:'Claro',deviceId:'d4',slot:'Slot 1',owner:'Gustavo',team:'Instalação',cost:3990,notes:'Último local conhecido: veículo 02.'},
{name:'Contingência',carrier:'TIM',status:'reserve',location:'Armário da TI · Gaveta 2',owner:'Helena',team:'TI',cost:2490,notes:'Envelope azul · etiqueta RESERVA 01.'},
{name:'Reserva operacional',carrier:'Vivo',status:'reserve',owner:'Helena',team:'TI',cost:2490,notes:'Confirmar onde foi guardado.'}
].map((x,i)=>({...newLine(),...x,id:'example-'+i,number:'5590000'+String(i+1).padStart(4,'0'),version:1})) as Line[];
