// Test-only provider transport. Loaded explicitly with node --import by isolated fixtures.
// No HTTP endpoint or production environment switch enables this simulator.
const original=globalThis.fetch;
const message=text=>new Response(JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text}]}]}));
const call=(name,payload)=>new Response(JSON.stringify({status:'completed',output:[{type:'function_call',call_id:crypto.randomUUID(),name,arguments:JSON.stringify({payload:JSON.stringify(payload)})}]}));
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')return original(url,options);
 const body=JSON.parse(options.body),input=body.input;
 if(!body.tools)throw Error('A conversa de teste deve usar ferramentas.');
 if(body.tools.some(t=>/approve|save|write|vault_read/.test(t.name)))throw Error('Ferramenta de gravação indevida.');
 const user=input.filter(i=>i.role==='user').at(-1)?.content??'';
 const last=input.at(-1);
 if(user==='Assunto externo')return message('Posso ajudar com linhas, aparelhos e verificações do Atlas. O que deseja organizar?');
 if(user==='Quero guardar uma senha')return call('abrir_cofre',{});
 if(user==='Cadastrar celular')return message('Qual é o nome e o modelo do aparelho?');
 if(user==='Falha do provedor')return new Response('{}',{status:429});
 const edit=user==='Editar local para Filial';
 const corrected=user==='Corrigir local para Sede';
 if(last.type!=='function_call_output')return call('consultar_linhas_aparelhos',{kind:'devices',query:edit?'Celular Financeiro':'',offset:0,limit:20});
 const data=JSON.parse(last.output);
 if(data.settingsVersion!==undefined){
  const device=data.items[0];
  return call('preparar_linha_aparelho',{kind:'device',action:edit?'edit':'create',settingsVersion:data.settingsVersion,...(edit?{targetId:device.id,expectedVersion:data.settingsVersion}:{}),fields:edit?{location:'Filial'}:{name:'Celular Financeiro',type:'iphone',model:'iPhone 15',location:corrected?'Sede':'Financeiro',owner:'Equipe'}});
 }
 return message('Confira a proposta.');
};
