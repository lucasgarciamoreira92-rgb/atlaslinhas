import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {ExternalLink,CheckCircle2,KeyRound,PlugZap} from 'lucide-react';
import './assistant-setup.css';

const suggestedModel='gpt-5.4-mini';
const links={keys:'https://platform.openai.com/api-keys',billing:'https://platform.openai.com/settings/organization/billing/overview',usage:'https://platform.openai.com/usage',models:'https://developers.openai.com/api/docs/models/gpt-5.4-mini',guide:'https://developers.openai.com/api/docs/quickstart'};
function HelpLink({href,children}:{href:string;children:ReactNode}){return <a href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={13} aria-hidden="true"/></a>}

export default function AssistantConfig({configured,currentModel,onSaved,onChat}:{configured:boolean;currentModel:string;onSaved:(model:string)=>void;onChat:()=>void}){
 const [step,setStep]=useState(configured?3:1),[key,setKey]=useState(''),[model,setModel]=useState(currentModel||suggestedModel),[password,setPassword]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[testedAt,setTestedAt]=useState('');
 const controller=useRef<AbortController|null>(null),title=useRef<HTMLHeadingElement>(null),lock=useRef(false);
 useEffect(()=>()=>{controller.current?.abort()},[]);
 useEffect(()=>{title.current?.focus();title.current?.scrollIntoView({block:'nearest'})},[step]);
 function go(next:number){setError('');setKey('');setPassword('');setModel(currentModel||suggestedModel);setStep(next)}
 async function post(path:string,body:unknown){
  controller.current=new AbortController();
  const r=await fetch(path,{method:'POST',signal:controller.current.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let d:{error?:string;model?:string;tested?:boolean;checkedAt?:string};
  try{d=await r.json()}catch{throw Error('Não foi possível ler a resposta do Atlas. Confira se a aplicação continua aberta.')}
  if(!r.ok)throw Error(d.error||'Não foi possível concluir. Tente novamente.');return d;
 }
 async function save(e:FormEvent){
  e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setTestedAt('');
  try{const d=await post('/api/assistant/config',{apiKey:key,model,password});if(controller.current?.signal.aborted)return;setKey('');setPassword('');onSaved(d.model||model.trim());setStep(3)}
  catch(e){if(!controller.current?.signal.aborted){setKey('');setPassword('');setError(e instanceof TypeError?'Não foi possível falar com o Atlas. Confira se a aplicação está aberta.':(e as Error).message)}}
  finally{lock.current=false;setBusy(false)}
 }
 async function testConnection(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setTestedAt('');
  try{const d=await post('/api/assistant/test',{confirmed:true});if(controller.current?.signal.aborted)return;if(!d.tested||!d.checkedAt)throw Error('O teste não confirmou a conexão. Tente novamente.');setTestedAt(d.checkedAt)}
  catch(e){if(!controller.current?.signal.aborted)setError(e instanceof TypeError?'Não foi possível falar com o Atlas. Confira se a aplicação está aberta.':(e as Error).message)}
  finally{lock.current=false;setBusy(false)}
 }
 return <div className="assistant-setup" aria-label="Configuração guiada da IA" aria-busy={busy}>
  <ol className="setup-progress" aria-label="Etapas da configuração">{['Conta','Conectar','Testar'].map((text,i)=><li key={text} aria-current={step===i+1?'step':undefined}><span>{i+1}</span>{text}</li>)}</ol>
  <h3 ref={title} tabIndex={-1}>{step===1?'Vamos conectar o Atlinhas?':step===2?'Conecte sua conta':'Confira a conexão'}</h3>
  {step===1&&<div className="setup-content">
   <p>Você configura uma vez para conversar com a IA dentro do Atlas. Somente administradores podem fazer esta conexão.</p>
   <div className="setup-note"><strong>Como funciona o pagamento?</strong><p>A API tem cobrança por uso, separada da assinatura do ChatGPT. Confira a cobrança e o saldo da conta que usará aqui.</p><HelpLink href={links.billing}>Abrir cobrança da API</HelpLink></div>
   <ol className="setup-instructions">
    <li><strong>Entre na plataforma OpenAI</strong><p>Use sua conta e selecione o projeto que será usado pelo Atlas.</p></li>
    <li><strong>Crie uma chave para o Atlas Linhas</strong><p>Na página de chaves, clique em “Create new secret key”. Dê um nome, como “Atlas Linhas”, e copie a chave criada.</p><HelpLink href={links.keys}>Abrir página de chaves</HelpLink></li>
    <li><strong>Volte para esta tela</strong><p>Cole a chave no próximo passo. Ela autoriza a conexão e deve ser usada somente no campo protegido, nunca na conversa.</p></li>
   </ol>
   <button className="setup-primary" onClick={()=>go(2)}><KeyRound size={17} aria-hidden="true"/>Já tenho a chave · continuar</button>
   {configured&&<button className="setup-secondary" onClick={()=>go(3)}>Usar configuração salva</button>}
   <HelpLink href={links.guide}>Guia oficial da OpenAI</HelpLink>
  </div>}
  {step===2&&<form className="assistant-config" onSubmit={save}>
   <p>{configured?'Você já tem uma configuração salva. Pode manter a chave e ajustar o modelo.':'Faltam a chave, o modelo e sua confirmação de administrador.'}</p>
   <label><span>Chave da API</span><input aria-label="Chave da API" aria-describedby="setup-key-help" type="password" autoComplete="off" spellCheck={false} value={key} onChange={e=>setKey(e.target.value)} required={!configured} minLength={20} maxLength={512} disabled={busy} placeholder={configured?'Deixe vazio para manter a chave salva':'Cole a chave criada na OpenAI'}/><small id="setup-key-help">{configured?'A chave salva permanece oculta. Preencha apenas para substituí-la.':'A chave fica protegida neste Mac e não aparece no chat.'}</small></label>
   <label><span>Identificador do modelo</span><input aria-label="Identificador do modelo" aria-describedby="setup-model-help" value={model} onChange={e=>setModel(e.target.value)} required maxLength={100} disabled={busy} autoComplete="off" spellCheck={false}/><small id="setup-model-help">É a IA que responderá. Sugestão inicial: GPT-5.4 mini. O teste confirma se sua conta permite usá-lo.</small></label>
   <div className="setup-model-links"><button className="setup-secondary" type="button" disabled={busy} onClick={()=>setModel(suggestedModel)}>Usar modelo sugerido</button><HelpLink href={links.models}>Modelo e preço</HelpLink></div>
   <label><span>Sua senha de acesso ao Atlas</span><input aria-label="Sua senha de acesso ao Atlas" aria-describedby="setup-password-help" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={128} disabled={busy}/><small id="setup-password-help">A mesma senha usada para entrar no Atlas Linhas. Ela confirma que você autoriza esta alteração.</small></label>
   {error&&<p role="alert">{error}</p>}
   <button className="setup-primary" disabled={busy}>{busy?'Salvando…':'Salvar configuração'}</button>
   <p className="setup-caption">Salvar não faz uma chamada à OpenAI. O teste é feito no próximo passo, quando você clicar.</p>
   <button type="button" className="setup-secondary" disabled={busy} onClick={()=>go(1)}>Voltar ao tutorial</button>
  </form>}
  {step===3&&<div className="setup-content">
   <div className={'setup-note'+(testedAt?' setup-success':'')} role="status"><strong>{testedAt?'Conexão testada com sucesso':'Configuração salva · teste pendente'}</strong><p>Modelo: <b>{currentModel}</b></p>{testedAt?<p>O modelo respondeu às {new Date(testedAt).toLocaleTimeString('pt-BR')}. Agora experimente um pedido na conversa.</p>:<p>Salvar os dados ainda não confirma que a chave e o modelo funcionam.</p>}</div>
   <p>O teste envia somente uma mensagem de exemplo à OpenAI. Não consulta seus cadastros nem o Cofre. Pode gerar uma pequena cobrança na sua conta da API.</p>
   {error&&<div role="alert" className="setup-error"><p>{error}</p><p>Confira os dados em “Alterar configuração” ou a cobrança na OpenAI.</p><HelpLink href={links.billing}>Conferir cobrança da API</HelpLink></div>}
   <button className="setup-primary" disabled={busy} onClick={()=>void testConnection()}><PlugZap size={17} aria-hidden="true"/>{busy?'Testando conexão…':testedAt?'Testar novamente':'Testar conexão'}</button>
   <button className={testedAt?'setup-primary':'setup-secondary'} disabled={busy} onClick={onChat}>{testedAt&&<CheckCircle2 size={17} aria-hidden="true"/>}{testedAt?'Começar a conversar':'Ir para conversa sem testar'}</button>
   <div className="setup-actions"><button className="setup-secondary" disabled={busy} onClick={()=>go(2)}>Alterar configuração</button><button className="setup-secondary" disabled={busy} onClick={()=>go(1)}>Ver tutorial</button></div>
   <HelpLink href={links.usage}>Acompanhar consumo na OpenAI</HelpLink>
  </div>}
 </div>;
}
