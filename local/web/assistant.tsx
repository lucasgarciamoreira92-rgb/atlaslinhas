import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import AssistantConfig from './assistant-config';
import AssistantDraft from './assistant-draft';
import AssistantAccounts from './assistant-accounts';
import AssistantVault from './assistant-vault';
import AssistantConversation from './assistant-conversation';
import AssistantMascot from './assistant-mascot';
import './assistant.css';
import './assistant-mascot.css';
export default function Assistant(){
 const [mode,setMode]=useState<'draft'|'accounts'|'vault'|'chat'|'config'>('draft');
 const [open,setOpen]=useState(false),[allowed,setAllowed]=useState(false),[configured,setConfigured]=useState(false),[configuredModel,setConfiguredModel]=useState('');
 const rootRef=useRef<HTMLElement>(null),panelRef=useRef<HTMLElement>(null);
 useEffect(()=>{const c=new AbortController();fetch('/api/assistant',{signal:c.signal}).then(async r=>{if(!r.ok)return;const d=await r.json() as {configured:boolean;model:string};setAllowed(true);setConfigured(d.configured);setConfiguredModel(d.model);if(d.configured)setMode('chat');}).catch(()=>{});return()=>c.abort()},[]);
 useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>{const target=mode==='chat'?panelRef.current?.querySelector<HTMLTextAreaElement>('textarea'):panelRef.current?.querySelector<HTMLButtonElement>('.assistant-close');target?.focus()});return()=>cancelAnimationFrame(frame)},[open]);
 function close(){setOpen(false);requestAnimationFrame(()=>rootRef.current?.querySelector<HTMLButtonElement>('.assistant-launch')?.focus())}
 if(!allowed)return null;
 return <aside ref={rootRef} className="atlas-assistant" onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();close()}}}>
  <AssistantMascot open={open} onToggle={()=>open?close():setOpen(true)} rootRef={rootRef} panelRef={panelRef}/>
  <section ref={panelRef} id="assistant-panel" aria-label={mode==='config'?'Configuração do assistente':'Assistente Atlas'} hidden={!open}>
   <header className="assistant-header"><span className="assistant-signal" aria-hidden="true"/><div className="assistant-title"><strong>Atlinhas</strong><small>Seu assistente no Atlas</small></div><button type="button" className="assistant-close" onClick={close} aria-label="Fechar assistente"><X size={20} aria-hidden="true"/></button></header>
   <nav aria-label="Modo do assistente"><button aria-pressed={mode==='draft'} onClick={()=>setMode('draft')}>Preparar cadastro</button><button aria-pressed={mode==='accounts'} onClick={()=>setMode('accounts')}>Verificações</button><button aria-pressed={mode==='vault'} onClick={()=>setMode('vault')}>Cofre protegido</button><button aria-pressed={mode==='chat'} onClick={()=>setMode(configured?'chat':'config')}>Conversa OpenAI</button><button aria-pressed={mode==='config'} onClick={()=>setMode('config')}>Configurar OpenAI</button></nav>
   <div hidden={mode!=='draft'}><AssistantDraft/></div>
   <div hidden={mode!=='accounts'}><AssistantAccounts/></div>
   {open&&mode==='vault'&&<AssistantVault/>}
   {open&&mode==='config'&&<AssistantConfig configured={configured} currentModel={configuredModel} onSaved={model=>{setConfigured(true);setConfiguredModel(model)}} onChat={()=>setMode('chat')}/>}
   {mode==='chat'&&<AssistantConversation onVault={()=>setMode('vault')}/>}
  </section>
 </aside>;
}
