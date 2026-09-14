import assert from 'node:assert/strict';
import {isolatedServer} from '../tests/e2e/support/server.ts';

// All data and the provider are isolated. Never reads the user's installation.
const app=await isolatedServer(true);
async function request(path,body,cookie,status=200){
 const r=await fetch(app.url+path,{method:body?'POST':'GET',headers:{Origin:app.url,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal(r.status,status,path);return {data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const password='01234567';
try{
 await request('/api/assistant/test',{confirmed:true},undefined,401);
 const admin=(await request('/api/auth/setup',{name:'Teste',email:'setup@example.invalid',password},undefined,201)).cookie;
 await request('/api/team',{name:'Operador',email:'op@example.invalid',password,active:true,version:0},admin);
 const op=(await request('/api/auth/login',{email:'op@example.invalid',password})).cookie;
 await request('/api/assistant/test',{confirmed:true},op,403);
 await request('/api/assistant/test',{confirmed:false},admin,400);
 await request('/api/assistant/test',{confirmed:true,messages:[{role:'user',content:'texto indevido'}]},admin,400);
 const before=(await request('/api/lines',null,admin)).data;
 const beforeSettings=(await request('/api/settings',null,admin)).data;
 const beforeAccess=(await request('/api/access',null,admin)).data;
 const config={apiKey:'',model:'modelo-ficticio',password};
 await request('/api/assistant/config',config,op,403);
 await request('/api/assistant/config',{...config,password:'incorreta'},admin,403);
 await request('/api/assistant/config',{...config,model:'modelo inválido'},admin,400);
 await request('/api/assistant/config',config,admin);
 const result=(await request('/api/assistant/test',{confirmed:true},admin)).data;
 assert.equal(result.tested,true);assert.equal(result.model,'modelo-ficticio');assert.ok(result.checkedAt);
 assert.deepEqual(Object.keys(result).sort(),['checkedAt','model','tested']);
 for(const [model,phrase] of [['teste-chave-invalida','chave da OpenAI'],['teste-modelo-ausente','Modelo não encontrado'],['teste-sem-saldo','saldo ou cota insuficiente']]){
  await request('/api/assistant/config',{...config,model},admin);
  const {data}=await request('/api/assistant/test',{confirmed:true},admin,502);
  assert.ok(data.error.includes(phrase));assert.ok(!JSON.stringify(data).includes('SEGREDO_DO_PROVEDOR'));
 }
 assert.deepEqual((await request('/api/lines',null,admin)).data,before);
 assert.deepEqual((await request('/api/settings',null,admin)).data,beforeSettings);
 assert.deepEqual((await request('/api/access',null,admin)).data,beforeAccess);
 console.log('PASS: teste explícito, administrador, confirmação obrigatória, chave mantida, erro sanitizado, resposta real do transporte simulado e cadastros preservados.');
}finally{await app.close()}
