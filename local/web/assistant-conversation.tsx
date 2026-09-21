import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowUp} from 'lucide-react';
type Message={role:'user'|'assistant';content:string};
type Review={state:string;subject?:string;approvalToken?:string;expiresAt?:number;permissions?:string;changes?:{field:string;before:unknown;after:unknown}[];referenceLabels?:Record<string,string>};
const labels:Record<string,string>={number:'Número',name:'Identificação',carrier:'Operadora',usage:'Finalidade',status:'Situação',deviceId:'Aparelho',slot:'Slot / eSIM',location:'Local',owner:'Responsável',team:'Equipe',platform:'Plataforma',dataPackage:'Pacote de dados',cost:'Mensalidade',dueDay:'Vencimento',type:'Tipo',model:'Modelo',slots:'Slots',service:'Serviço',label:'Nome da conta',login:'Login',kind:'Tipo de conta',ownerId:'Responsável',sector:'Setor',mfa:'Verificação em duas etapas',archived:'Arquivada',methods:'Métodos',purpose:'Finalidade',stage:'Etapa',preferred:'Preferencial',instruction:'Orientação',destinations:'Destinos',lineId:'Linha',accountId:'Conta',personId:'Pessoa',description:'Identificação',state:'Disponibilidade'};
const values:Record<string,string>={active:'Em uso',reserve:'Reserva',suspended:'Suspensa',cancelled:'Cancelada',phone:'Ligações / WhatsApp',api:'API oficial',groups:'Grupos WhatsApp',other:'Outro',enabled:'Ativada',disabled:'Desativada',unknown:'Não conferida',unsupported:'Serviço não oferece',iphone:'iPhone',android:'Android',email:'E-mail',service:'Serviço',access:'Acesso',recovery:'Recuperação',both:'Acesso e recuperação',sms:'SMS',call:'Ligação',authenticator:'Autenticador',prompt:'Aprovação no aparelho',passkey:'Chave de acesso',key:'Chave física',available:'Disponível',unavailable:'Sem acesso'};
function describe(value:unknown,field:string,refs:Record<string,string>):string{
 if(value===null||value===undefined||value==='')return 'Não informado';if(typeof value==='boolean')return value?'Sim':'Não';
 if(field==='cost'&&typeof value==='number')return (value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 if(Array.isArray(value))return value.length?value.map(v=>describe(v,field,refs)).join('\n\n'):'Nenhum';
 if(typeof value==='object')return Object.entries(value).filter(([k])=>k!=='id').map(([k,v])=>(labels[k]??k)+': '+describe(v,k,refs)).join('\n');
 return refs[String(value)]??values[String(value)]??String(value);
}
export default function AssistantConversation({onVault,resetSignal}:{onVault:()=>void;resetSignal:number}){
 const [messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(''),[conversationId,setConversationId]=useState<string|null>(null),[review,setReview]=useState<Review|null>(null),[vault,setVault]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null),end=useRef<HTMLDivElement>(null),lastReset=useRef(resetSignal);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{end.current?.scrollIntoView({block:'nearest'})},[messages,busy]);
 useEffect(()=>{if(!review?.expiresAt)return;const timer=setTimeout(()=>setReview(null),Math.max(0,review.expiresAt-Date.now()));return()=>clearTimeout(timer)},[review]);
 useEffect(()=>{if(resetSignal===lastReset.current)return;lastReset.current=resetSignal;void reset()},[resetSignal]);
 async function call(path:string,body:unknown){const r=await fetch(path,{method:'POST',signal:controller.current?.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json() as {error?:string;conversationId:string;reply:string;review?:Review;openVault?:boolean};if(!r.ok)throw Error(d.error||'Não foi possível concluir.');return d;}
 async function send(e:FormEvent){e.preventDefault();if(busy||!text.trim())return;const message=text.trim();setBusy(true);setError('');setReview(null);setVault(false);controller.current=new AbortController();
 try{const d=await call('/api/assistant/conversation',{action:'message',message,conversationId});setMessages(m=>[...m,{role:'user',content:message},{role:'assistant',content:d.reply}]);setText('');setConversationId(d.conversationId);setReview(d.review??null);setVault(!!d.openVault);}catch(e){if(!controller.current.signal.aborted)setError((e as Error).message);}finally{setBusy(false);}}
 async function reset(){if(busy)return;setBusy(true);setReview(null);setError('');controller.current=new AbortController();try{await call('/api/assistant/conversation',{action:'reset'});setMessages([]);setConversationId(null);setText('');setVault(false)}catch(e){if(!controller.current.signal.aborted)setError((e as Error).message)}finally{setBusy(false)}}
 async function approve(){if(busy||!review?.approvalToken||text.trim())return;const token=review.approvalToken;setBusy(true);setReview(null);setError('');try{await call('/api/assistant/approve',{approvalToken:token,confirmed:true});setMessages(m=>[...m,{role:'assistant',content:'Cadastro salvo após sua aprovação. Atualize a tela do cadastro para consultar.'}]);setConversationId(null);}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="assistant-conversation" aria-label="Conversa com IA">
  <div className="assistant-messages" role="log" aria-live="polite">
   {!messages.length&&<article className="assistant assistant-welcome"><span className="assistant-avatar" aria-hidden="true">A</span><div><p>Olá! O que você quer fazer no Atlas?</p><small>Você pode consultar, cadastrar ou editar usando uma conversa normal. Antes de salvar qualquer alteração, eu mostrarei um resumo para sua aprovação.</small></div></article>}
   {messages.map((m,i)=><article key={i} className={m.role}>{m.role==='assistant'&&<span className="assistant-avatar" aria-hidden="true">A</span>}<p>{m.content}</p></article>)}
   {busy&&<p className="assistant-working" role="status"><span/><span/><span/><b>Atlinhas está trabalhando</b></p>}<div ref={end}/>
  </div>
  {error&&<p className="assistant-error" role="alert">{error}</p>}
  {review?.state==='ready_for_review'&&<div className="assistant-review" aria-label="Resumo para aprovação"><strong>Confira antes de salvar</strong><p>{review.subject}</p>{review.changes?.map(c=><div key={c.field}><strong>{labels[c.field]??c.field}</strong><p>Antes: {describe(c.before,c.field,review.referenceLabels??{})}</p><p>Depois: {describe(c.after,c.field,review.referenceLabels??{})}</p></div>)}{review.permissions&&<p>{review.permissions}</p>}<p>Para corrigir, escreva abaixo e envie uma nova mensagem.</p><button disabled={busy||!!text.trim()} onClick={()=>void approve()}>Aprovar e salvar</button><button disabled={busy} onClick={()=>void reset()}>Descartar proposta</button></div>}
  {vault&&<button className="assistant-open-vault" onClick={onVault}>Abrir Cofre protegido</button>}
  <form className="assistant-composer" onSubmit={send}>
   <label className="assistant-sr-only" htmlFor="assistant-conversation-input">Mensagem</label>
   <textarea id="assistant-conversation-input" rows={1} maxLength={4000} disabled={busy} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} placeholder="Fale com o Atlinhas…"/>
   <button className="assistant-send" disabled={busy||!text.trim()} aria-label="Enviar" title="Enviar"><ArrowUp size={21} aria-hidden="true"/></button>
  </form>
  <small className="assistant-enter-hint">Enter envia · Shift + Enter cria uma nova linha</small>
 </div>;
}
