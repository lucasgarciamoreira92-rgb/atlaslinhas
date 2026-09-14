import {useEffect,useState} from 'react';
import './assistant.css';
import AssistantConfig from './assistant-config';
import AssistantDraft from './assistant-draft';
import AssistantAccounts from './assistant-accounts';
import AssistantVault from './assistant-vault';
import AssistantConversation from './assistant-conversation';
export default function Assistant(){
 const [mode,setMode]=useState<'draft'|'accounts'|'vault'|'chat'|'config'>('draft');
 const [open,setOpen]=useState(false),[allowed,setAllowed]=useState(false),[configured,setConfigured]=useState(false);
 useEffect(()=>{const c=new AbortController();fetch('/api/assistant',{signal:c.signal}).then(async r=>{if(!r.ok)return;const d=await r.json() as {configured:boolean};setAllowed(true);setConfigured(d.configured);}).catch(()=>{});return()=>c.abort()},[]);
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
   {mode==='chat'&&<AssistantConversation onVault={()=>setMode('vault')}/>}
  </section>
 </aside>;
}
