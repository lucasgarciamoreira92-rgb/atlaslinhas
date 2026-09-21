import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ChevronRight,KeyRound,ListChecks,Settings2,ShieldCheck,SquarePen,X} from 'lucide-react';
import AssistantConfig from './assistant-config';
import AssistantDraft from './assistant-draft';
import AssistantAccounts from './assistant-accounts';
import AssistantVault from './assistant-vault';
import AssistantConversation from './assistant-conversation';
import AssistantMascot from './assistant-mascot';
import './assistant.css';
import './assistant-mascot.css';

type Mode='chat'|'settings'|'config'|'draft'|'accounts'|'vault';

export default function Assistant(){
 const [mode,setMode]=useState<Mode>('config');
 const [open,setOpen]=useState(false),[allowed,setAllowed]=useState(false),[configured,setConfigured]=useState(false),[configuredModel,setConfiguredModel]=useState(''),[resetSignal,setResetSignal]=useState(0);
 const rootRef=useRef<HTMLElement>(null),panelRef=useRef<HTMLElement>(null);
 useEffect(()=>{const c=new AbortController();fetch('/api/assistant',{signal:c.signal}).then(async r=>{if(!r.ok)return;const d=await r.json() as {configured:boolean;model:string};setAllowed(true);setConfigured(d.configured);setConfiguredModel(d.model);setMode(d.configured?'chat':'config');}).catch(()=>{});return()=>c.abort()},[]);
 useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>{const target=mode==='chat'?panelRef.current?.querySelector<HTMLTextAreaElement>('textarea'):panelRef.current?.querySelector<HTMLButtonElement>('.assistant-back, .assistant-close');target?.focus()});return()=>cancelAnimationFrame(frame)},[open,mode]);
 function close(){setOpen(false);requestAnimationFrame(()=>rootRef.current?.querySelector<HTMLButtonElement>('.assistant-launch')?.focus())}
 function openChat(){setMode(configured?'chat':'config')}
 function back(){if(mode==='settings'||!configured)openChat();else setMode('settings')}
 const settingsHome=mode==='settings';
 if(!allowed)return null;
 return <aside ref={rootRef} className="atlas-assistant" onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();close()}}}>
  <AssistantMascot open={open} onToggle={()=>open?close():setOpen(true)} rootRef={rootRef} panelRef={panelRef}/>
  <section ref={panelRef} id="assistant-panel" className={`assistant-panel assistant-panel-${mode}`} aria-label={mode==='config'?'Configuração do assistente':'Assistente Atlas'} hidden={!open}>
   <header className="assistant-header">
    {mode!=='chat'&&configured?<button type="button" className="assistant-icon assistant-back" onClick={back} aria-label={settingsHome?'Voltar à conversa':'Voltar às configurações'} title={settingsHome?'Voltar à conversa':'Voltar às configurações'}><ArrowLeft size={20} aria-hidden="true"/></button>:<span className="assistant-signal" aria-hidden="true"/>}
    <div className="assistant-title"><strong>{settingsHome?'Configurações':'Atlinhas'}</strong><small>{mode==='chat'?'Assistente conectado':settingsHome?'Assistente e recursos':configured?'Ajuste protegido':'Configure para começar'}</small></div>
    <div className="assistant-header-actions">
     {mode==='chat'&&<><button type="button" className="assistant-icon" onClick={()=>setResetSignal(v=>v+1)} aria-label="Nova conversa" title="Nova conversa"><SquarePen size={19} aria-hidden="true"/></button><button type="button" className="assistant-icon" onClick={()=>setMode('settings')} aria-label="Abrir configurações" title="Configurações"><Settings2 size={20} aria-hidden="true"/></button></>}
     <button type="button" className="assistant-icon assistant-close" onClick={close} aria-label="Fechar assistente" title="Fechar"><X size={20} aria-hidden="true"/></button>
    </div>
   </header>
   {settingsHome&&<div className="assistant-settings-home">
    <p>A conversa continua sendo sua tela principal.</p>
    <button type="button" className="assistant-setting-row" onClick={()=>setMode('config')}><KeyRound size={19} aria-hidden="true"/><span><strong>Conexão com a OpenAI</strong><small>{configuredModel||'Configurar chave e modelo'}</small></span>{configured&&<b>Conectada</b>}<ChevronRight size={18} aria-hidden="true"/></button>
    <button type="button" className="assistant-setting-row" onClick={()=>setMode('vault')}><ShieldCheck size={19} aria-hidden="true"/><span><strong>Cofre protegido</strong><small>Credenciais e acessos autorizados</small></span><ChevronRight size={18} aria-hidden="true"/></button>
    <button type="button" className="assistant-setting-row" onClick={()=>setMode('accounts')}><ListChecks size={19} aria-hidden="true"/><span><strong>Verificações e autenticações</strong><small>Contas, destinos e responsáveis</small></span><ChevronRight size={18} aria-hidden="true"/></button>
    <button type="button" className="assistant-setting-row" onClick={()=>setMode('draft')}><SquarePen size={19} aria-hidden="true"/><span><strong>Cadastro guiado manual</strong><small>Alternativa sem usar a conversa</small></span><ChevronRight size={18} aria-hidden="true"/></button>
   </div>}
   {mode==='draft'&&<AssistantDraft/>}
   {mode==='accounts'&&<AssistantAccounts/>}
   {open&&mode==='vault'&&<AssistantVault/>}
   {open&&mode==='config'&&<AssistantConfig configured={configured} currentModel={configuredModel} onSaved={model=>{setConfigured(true);setConfiguredModel(model)}} onChat={()=>setMode('chat')}/>}
   {mode==='chat'&&<AssistantConversation resetSignal={resetSignal} onVault={()=>setMode('vault')}/>}
  </section>
 </aside>;
}
