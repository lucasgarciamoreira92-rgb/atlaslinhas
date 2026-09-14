import {useEffect,useRef,useState,type FormEvent} from 'react';
import './assistant.css';
import AssistantConfig from './assistant-config';
import AssistantDraft from './assistant-draft';
import AssistantAccounts from './assistant-accounts';
import AssistantVault from './assistant-vault';
type Message={role:'user'|'assistant';content:string};
export default function Assistant(){
 const [mode,setMode]=useState<'draft'|'accounts'|'vault'|'chat'|'config'>('draft');
 const [open,setOpen]=useState(false),[allowed,setAllowed]=useState(false),[configured,setConfigured]=useState(false),[messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const end=useRef<HTMLDivElement>(null),controller=useRef<AbortController|null>(null);
 useEffect(()=>{const c=new AbortController();fetch('/api/assistant',{signal:c.signal}).then(async r=>{if(!r.ok)return;const d=await r.json() as {configured:boolean};setAllowed(true);setConfigured(d.configured);}).catch(()=>{});return()=>{c.abort();controller.current?.abort();};},[]);
 useEffect(()=>{if(open)end.current?.scrollIntoView({block:'nearest'});},[messages,busy,open]);
 async function send(e:FormEvent){e.preventDefault();if(busy||!text.trim()||!configured)return;const next:Message[]=[...messages,{role:'user',content:text.trim()}];if(next.length>29){setError('Inicie uma nova conversa para continuar.');return;}setBusy(true);setError('');const c=new AbortController();controller.current=c;
 try{const r=await fetch('/api/assistant',{method:'POST',signal:c.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next})});const d=await r.json() as {error?:string;reply:string};if(!r.ok)throw Error(d.error||'Não foi possível obter a resposta.');setMessages([...next,{role:'assistant',content:d.reply}]);setText('');}catch(e){if(!c.signal.aborted)setError((e as Error).message);}finally{setBusy(false);controller.current=null;}}
 if(!allowed)return null;
 return <aside className="atlas-assistant">
  <button className="assistant-launch" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="assistant-panel">+ Assistente</button>
  <section id="assistant-panel" aria-label={mode==='config'?'Configuração do assistente':'Assistente Atlas'} hidden={!open}>
   <header><strong>Assistente Atlas · piloto</strong><button onClick={()=>setOpen(false)} aria-label="Fechar assistente">Fechar</button></header>
   <nav aria-label="Modo do assistente"><button onClick={()=>setMode('draft')}>Preparar cadastro</button><button onClick={()=>setMode('accounts')}>Verificações</button><button onClick={()=>setMode('vault')}>Cofre protegido</button><button onClick={()=>setMode(configured?'chat':'config')}>Conversa OpenAI</button><button onClick={()=>setMode('config')}>Configurar OpenAI</button></nav>
   <div hidden={mode!=='draft'}><AssistantDraft/></div>
   <div hidden={mode!=='accounts'}><AssistantAccounts/></div>
   {open&&mode==='vault'&&<AssistantVault/>}
   {mode==='config'&&<AssistantConfig onSaved={()=>{setConfigured(true);setMode('chat');}}/>}
   {mode==='chat'&&<><p>Conversa OpenAI separada do rascunho. Não acessa seus cadastros. Não digite senhas.</p><div className="assistant-messages" role="log" aria-live="polite">{messages.map((m,i)=><article className={m.role} key={i}><small>{m.role==='user'?'Você':'Atlas'}</small><p>{m.content}</p></article>)}{busy&&<p role="status">Aguardando a OpenAI…</p>}<div ref={end}/></div>{error&&<p role="alert">{error}</p>}<form onSubmit={send}><label htmlFor="assistant-input">Mensagem</label><textarea id="assistant-input" value={text} maxLength={4000} disabled={busy||!configured} onChange={e=>setText(e.target.value)}/><button disabled={busy||!configured||!text.trim()}>Enviar</button><button type="button" disabled={busy} onClick={()=>{setMessages([]);setText('');setError('');}}>Nova conversa</button></form></>}
  </section>
 </aside>;
}
