import {useCallback,useEffect,useState} from 'react';
import {CredentialPanel} from '@/app/access-panel';
import type {AccessAccount,AccessDirectory} from '@/lib/accounts';

export default function AssistantVault(){
 const [accounts,setAccounts]=useState<AccessAccount[]>([]),[selected,setSelected]=useState(''),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  try{const r=await fetch('/api/access',{cache:'no-store',signal});const d=await r.json() as AccessDirectory&{error?:string};if(!r.ok)throw Error(d.error||'Não foi possível consultar as contas.');setAccounts(d.accounts);setError('');}
  catch(e){if(!signal?.aborted)setError((e as Error).message);}
  finally{if(!signal?.aborted)setLoading(false);}
 },[]);
 useEffect(()=>{const c=new AbortController();void refresh(c.signal);return()=>c.abort()},[refresh]);
 const active=accounts.find(a=>a.id===selected);
 return <div className="assistant-vault access-module" aria-label="Cofre protegido do assistente">
  <p>Escolha a conta e desbloqueie para cadastrar ou alterar a credencial. Os campos protegidos não entram na conversa nem são enviados à OpenAI.</p>
  <p>Ao fechar este painel, trocar de aba ou sair da janela, os campos protegidos são limpos.</p>
  {error&&<p role="alert">{error}</p>}
  {loading?<p role="status">Consultando contas…</p>:<>
   <label className="access-field"><span>Buscar conta para o Cofre</span><input value={query} onChange={e=>{setQuery(e.target.value);setSelected('')}} autoComplete="off"/></label>
   <label className="access-field"><span>Conta do Cofre</span><select aria-label="Conta do Cofre" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecione uma conta</option>{accounts.filter(a=>!a.archived&&(!query||[a.label,a.login,a.service].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()))).map(a=><option key={a.id} value={a.id}>{a.label} · {a.login}</option>)}</select></label>
   {!accounts.length&&<p>Cadastre e aprove uma conta na aba Verificações para adicionar sua credencial.</p>}
   {active&&<CredentialPanel key={active.id+'-'+active.version} account={active} scope="assistant" onVault={()=>setError('Abra a seção Cofre no menu principal para consultar esta credencial.')} onSaved={()=>refresh()}/>}
  </>}
 </div>;
}
