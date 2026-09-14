/** Server-only transport. No database, credentials from the Cofre, or write tools. */
export type AssistantMessage = {role:'user'|'assistant';content:string};
let configuration=()=>({apiKey:process.env.OPENAI_API_KEY?.trim()||'',model:process.env.ATLAS_OPENAI_MODEL?.trim()||''});
export function setAssistantConfiguration(reader:typeof configuration){configuration=reader;}
export function assistantConnectionStatus(){
 const c=configuration();return {configured:!!c.apiKey&&!!c.model,provider:'openai',model:c.model};
}
export async function requestAssistant(messages:AssistantMessage[],transport:typeof fetch=fetch):Promise<string>{
 const {apiKey:key,model}=configuration();
 if(!key||!model)throw new Error('Configure a chave e o modelo da OpenAI no servidor do Atlas.');
 if(!messages.length||messages.length>30||messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>4000)||messages.reduce((n,m)=>n+m.content.length,0)>20000)throw new Error('Conversa fora do limite permitido.');
 let response:Response;
 try{response=await transport('https://api.openai.com/v1/responses',{
  method:'POST',signal:AbortSignal.timeout(25000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify({model,store:false,max_output_tokens:1500,
   instructions:'Você é o assistente do Atlas Linhas. Responda em português. Ajude com linhas, chips, aparelhos, verificações e contas. Pergunte o que falta, não invente cadastros. Nesta fase você não possui ferramentas nem acesso ao banco: nunca afirme que consultou ou salvou dados. Toda criação ou edição futura exigirá resumo e aprovação. Nunca peça senhas no chat; oriente usar o campo protegido do Cofre. Para assuntos externos, explique brevemente seu escopo.',input:messages})
 });}catch{throw new Error('Não foi possível conectar à OpenAI. Tente novamente.');}
 if(!response.ok)throw new Error(response.status===401?'A chave da OpenAI foi recusada.':response.status===429?'A OpenAI informou limite de uso. Confira a conta da API.':'A OpenAI não concluiu a solicitação.');
 let data:{status?:string;output?:Array<{type?:string;content?:Array<{type?:string;text?:string}>}>};
 try{data=await response.json();}catch{throw new Error('Resposta inválida da OpenAI.');}
 if(data.status!=='completed')throw new Error('A resposta ficou incompleta. Tente novamente.');
 const text=(data.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('\n');
 if(!text.trim())throw new Error('A OpenAI não retornou uma resposta textual.');
 return text;
}
