import {useEffect,useState,useRef} from 'react';
import {newAccount,methodLabels,mfaLabels,type AccountData,type VerificationMethod,type Destination,type AccessPerson} from '@/lib/accounts';
type Account=AccountData&{id:string;version:number};
type Directory={revision:number;accounts:Account[];people:AccessPerson[];devices:{id:string;name:string;model:string}[];lines:{id:string;name:string;number:string;deviceId:string|null}[]};
type Review={state:string;questions?:{question:string}[];permissions?:string;approvalToken?:string;changes?:{field:string;before:unknown;after:unknown}[]};
const labels:Record<string,string>={service:'Serviço',label:'Nome da conta',login:'Login',kind:'Tipo',ownerId:'Responsável',sector:'Setor',mfa:'Verificação em duas etapas',archived:'Arquivada',methods:'Métodos e destinos'};
const emptyDestination=():Destination=>({id:crypto.randomUUID(),lineId:null,deviceId:null,accountId:null,personId:null,description:'',state:'unknown'});
export default function AssistantAccounts(){
 const [directory,setDirectory]=useState<Directory|null>(null),[data,setData]=useState<AccountData|null>(null),[target,setTarget]=useState<Account|null>(null),[review,setReview]=useState<Review|null>(null);
 const [query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[messages,setMessages]=useState<string[]>([]),[discard,setDiscard]=useState(false);
 const controller=useRef<AbortController|null>(null);useEffect(()=>()=>controller.current?.abort(),[]);
 async function call<T>(body?:unknown):Promise<T>{const r=await fetch('/api/assistant/accounts',{signal:controller.current?.signal,headers:{'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const d=await r.json() as T&{error?:string};if(!r.ok)throw Error(d.error||'Falha na consulta.');return d;}
 async function run(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');controller.current=new AbortController();try{await fn();}catch(e){if(!controller.current.signal.aborted)setError((e as Error).message);}finally{setBusy(false);}}
 async function load(){await run(async()=>{setDirectory(await call<Directory>());});}
 function edit(next:AccountData){setData(next);setReview(null);setError('');}
 function changeMethod(index:number,next:VerificationMethod){edit({...data!,methods:data!.methods.map((m,i)=>i===index?next:m)});}
 function changeDestination(mi:number,di:number,next:Destination){const m=data!.methods[mi];changeMethod(mi,{...m,destinations:m.destinations.map((d,i)=>i===di?next:d)});}
 async function preview(){if(!data||!directory)return;await run(async()=>{setReview(null);const {checkedAt,checkedBy,...fields}=data;const r=await call<Review>({action:target?'edit':'create',...(target?{targetId:target.id,expectedVersion:target.version}:{}),revision:directory.revision,fields});setReview(r);setMessages(m=>[...m,...(r.questions?.map(q=>q.question)??[r.state==='unchanged'?'Nenhuma alteração proposta.':'Resumo preparado. Confira as alterações abaixo.'])]);});}
 async function approve(){if(!review?.approvalToken)return;const approvalToken=review.approvalToken;await run(async()=>{setReview(null);const r=await fetch('/api/assistant/approve',{method:'POST',signal:controller.current?.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({approvalToken,confirmed:true})});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'Não foi possível salvar.');setData(null);setTarget(null);setDirectory(null);setMessages(m=>[...m,'Conta salva após sua aprovação. Atualize Verificações para consultar.']);});}
 function person(value:string|null){return directory?.people.find(p=>p.id===value)?.name??'Não informado';}
 function describe(field:string,value:unknown):string{
  if(value===null||value===undefined||value==='')return 'Não informado';
  if(field==='ownerId')return person(value as string);if(field==='mfa')return mfaLabels[value as keyof typeof mfaLabels];if(field==='kind')return value==='email'?'E-mail':'Serviço';if(field==='archived')return value?'Sim':'Não';
  if(field==='methods')return (value as VerificationMethod[]).map(m=>`${methodLabels[m.type]} · ${m.purpose==='recovery'?'Recuperação':m.purpose==='both'?'Acesso e recuperação':'Acesso'} · etapa ${m.stage}${m.preferred?' · preferencial':''}\n${m.destinations.map(t=>`${directory?.lines.find(l=>l.id===t.lineId)?.number??directory?.devices.find(d=>d.id===t.deviceId)?.name??directory?.accounts.find(a=>a.id===t.accountId)?.login??t.description} · ${person(t.personId)} · ${t.state}`).join('\n')}\n${m.instruction}`).join('\n\n')||'Nenhum método';return String(value);
 }
 return <div className="assistant-guided" aria-label="Preparar verificações">
  <p>Verificações e autenticações · preparação guiada. Cadastre onde chegam as confirmações. Não informe senhas, códigos ou chaves secretas.</p>
  <div role="log" aria-label="Conversa das verificações">{messages.map((m,i)=><p key={i}>{m}</p>)}</div>
  {!data&&<><button disabled={busy} onClick={load}>Consultar contas e vínculos</button>{directory&&<><button disabled={busy} onClick={()=>{setTarget(null);setData(newAccount(null));setReview(null);}}>Nova conta de verificação</button><label>Buscar conta<input value={query} onChange={e=>setQuery(e.target.value)} maxLength={200}/></label>{directory.accounts.filter(a=>(a.service+' '+a.label+' '+a.login).toLowerCase().includes(query.toLowerCase())).map(a=><button key={a.id} disabled={busy} onClick={()=>{const {id,version,...fields}=a;setTarget(a);setData(fields);setReview(null);}}>Editar {a.label} · {a.login}</button>)}</>}</>}
  {data&&<fieldset disabled={busy} className="assistant-account-fields"><legend>{target?'Editar conta':'Nova conta'}</legend>
   {!target&&<p>Acesso inicial restrito aos administradores. O compartilhamento poderá ser ajustado no cadastro da conta.</p>}
   {(['service','label','login','sector'] as const).map(field=><label key={field}>{labels[field]}<input value={data[field]} onChange={e=>edit({...data,[field]:e.target.value})} maxLength={200}/></label>)}
   <label>Tipo de conta<select aria-label="Tipo de conta" value={data.kind} onChange={e=>edit({...data,kind:e.target.value as AccountData['kind']})}><option value="service">Serviço</option><option value="email">E-mail</option></select></label>
   <label>Responsável pela conta<select aria-label="Responsável pela conta" value={data.ownerId??''} onChange={e=>edit({...data,ownerId:e.target.value||null})}><option value="">Não informado</option>{directory?.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label>Verificação em duas etapas<select aria-label="Verificação em duas etapas" value={data.mfa} onChange={e=>edit({...data,mfa:e.target.value as AccountData['mfa']})}>{Object.entries(mfaLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   <p>Cadastrar um método não confirma que o 2FA está ativado no serviço.</p>
   {data.methods.map((m,mi)=><fieldset key={m.id} aria-label={'Método '+(mi+1)}><legend>Método {mi+1}</legend>
    <label>Método de confirmação<select aria-label="Método de confirmação" value={m.type} onChange={e=>{const type=e.target.value as VerificationMethod['type'];changeMethod(mi,{...m,type,purpose:type==='recovery'?'recovery':m.purpose,destinations:[emptyDestination()]});}}>{Object.entries(methodLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>Finalidade<select aria-label="Finalidade do método" value={m.purpose} onChange={e=>changeMethod(mi,{...m,purpose:e.target.value as VerificationMethod['purpose']})}><option value="access">Acesso</option><option value="recovery">Recuperação</option><option value="both">Ambas</option></select></label>
    <label>Etapa obrigatória<input type="number" min={1} max={10} value={m.stage} onChange={e=>changeMethod(mi,{...m,stage:Number(e.target.value)})}/></label>
    <label><input type="checkbox" checked={m.preferred} onChange={e=>changeMethod(mi,{...m,preferred:e.target.checked})}/>Preferencial nesta etapa</label>
    <label>Orientação, sem segredos<input value={m.instruction} maxLength={1000} onChange={e=>changeMethod(mi,{...m,instruction:e.target.value})}/></label>
    {m.destinations.map((t,di)=>{const channel=['sms','call'].includes(m.type)?'lineId':m.type==='email'?'accountId':['authenticator','prompt','passkey'].includes(m.type)?'deviceId':null;
     const options=channel==='lineId'?directory?.lines.map(l=>[l.id,l.name+' · '+l.number]):channel==='accountId'?directory?.accounts.filter(a=>a.kind==='email'&&a.id!==target?.id).map(a=>[a.id,a.login]):directory?.devices.map(d=>[d.id,d.name+' · '+d.model]);
     return <div key={t.id} className="assistant-destination" aria-label={'Destino '+(di+1)}>
      {channel&&<label>Destino vinculado<select aria-label="Destino vinculado" value={t[channel]??''} onChange={e=>changeDestination(mi,di,{...t,lineId:null,deviceId:null,accountId:null,[channel]:e.target.value||null})}><option value="">Selecione um cadastro</option>{options?.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
      {(!channel||m.type==='passkey')&&<label>Identificação ou local, sem códigos<input value={t.description} maxLength={500} onChange={e=>changeDestination(mi,di,{...t,description:e.target.value})}/></label>}
      <label>Responsável pelo destino<select aria-label="Responsável pelo destino" value={t.personId??''} onChange={e=>changeDestination(mi,di,{...t,personId:e.target.value||null})}><option value="">Não informado</option>{directory?.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Situação do destino<select aria-label="Situação do destino" value={t.state} onChange={e=>changeDestination(mi,di,{...t,state:e.target.value as Destination['state']})}><option value="unknown">Precisa conferir</option><option value="available">Disponível</option><option value="unavailable">Sem acesso</option></select></label>
      <button disabled={m.destinations.length===1} onClick={()=>changeMethod(mi,{...m,destinations:m.destinations.filter(d=>d.id!==t.id)})}>Remover destino {di+1}</button>
     </div>;})}
    <button disabled={m.destinations.length>=30} onClick={()=>changeMethod(mi,{...m,destinations:[...m.destinations,emptyDestination()]})}>Adicionar destino</button>
    <button onClick={()=>edit({...data,methods:data.methods.filter(method=>method.id!==m.id)})}>Remover método {mi+1}</button>
   </fieldset>)}
   <button disabled={data.methods.length>=40} onClick={()=>edit({...data,methods:[...data.methods,{id:crypto.randomUUID(),type:'sms',purpose:'access',stage:1,preferred:false,instruction:'',destinations:[emptyDestination()]}]})}>Adicionar método</button>
   <button onClick={preview}>Preparar resumo das verificações</button>
   <button onClick={()=>setDiscard(true)}>Descartar preparação</button>
  </fieldset>}
  {error&&<p role="alert">{error} A preparação foi mantida.</p>}{busy&&<p role="status">Preparando verificações…</p>}
  {review?.state==='ready_for_review'&&<div className="assistant-review" aria-label="Resumo das verificações"><h3>Resumo para aprovação</h3>{review.changes?.map(c=><div key={c.field}><strong>{labels[c.field]??c.field}</strong>{target&&<p>Antes: {describe(c.field,c.before)}</p>}<p>{target?'Depois: ':''}{describe(c.field,c.after)}</p></div>)}<p>{review.permissions}</p><p>Nada foi salvo. A aprovação vence em dez minutos.</p><button disabled={busy} onClick={approve}>Aprovar e salvar verificação</button></div>}
  {discard&&<div role="alert"><p>Descartar as alterações desta preparação?</p><button onClick={()=>{setData(null);setReview(null);setTarget(null);setDiscard(false);}}>Confirmar descarte</button><button onClick={()=>setDiscard(false)}>Continuar preparação</button></div>}
 </div>;
}
