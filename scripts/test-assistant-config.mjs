import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
const directory=await mkdtemp(join(tmpdir(),'atlas-ai-config-')),base='http://127.0.0.1:14319';
let child;
async function start(){child=spawn(process.execPath,['local-dist/server.mjs'],{env:{...process.env,ATLAS_DATA_DIR:directory,ATLAS_PORT:'14319',OPENAI_API_KEY:'',ATLAS_OPENAI_MODEL:''},stdio:['ignore','pipe','pipe']});await new Promise((yes,no)=>{const timer=setTimeout(()=>no(Error('Servidor não iniciou')),10000);child.once('exit',()=>{clearTimeout(timer);no(Error('Servidor encerrou'));});child.stdout.on('data',d=>{if(String(d).includes('Atlas Linhas disponível')){clearTimeout(timer);yes();}});});}
async function stop(){if(child?.exitCode===null){const end=once(child,'exit');child.kill();await end;}}
async function req(path,status=200,body,cookie){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,status,path);const text=await r.text();return {text,data:JSON.parse(text),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const fakeKey='sk-ficticia-nao-e-uma-chave-real',password='01234567';
try{
 await start();await req('/api/assistant',401);
 const admin=(await req('/api/auth/setup',201,{name:'Admin',email:'admin@example.invalid',password})).cookie;
 assert.equal((await req('/api/assistant',200,null,admin)).data.configured,false);
 await req('/api/assistant',503,{messages:[{role:'user',content:'oi'}]},admin);
 await req('/api/team',200,{name:'Operador',email:'op@example.invalid',password,active:true,version:0},admin);
 const op=(await req('/api/auth/login',200,{email:'op@example.invalid',password})).cookie;
 await req('/api/assistant/catalog?kind=lines',401);
 await req('/api/assistant/catalog?kind=lines',403,null,op);
 await req('/api/assistant/catalog?kind=vault',400,null,admin);
 await req('/api/assistant/catalog?kind=lines&limit=21',400,null,admin);
 const original=(await req('/api/settings',200,null,admin)).data.config;
 const device={id:'catalog-device',name:'Celular Operação',type:'iphone',model:'iPhone 15',location:'Sede',owner:'Equipe',slots:['Slot 1','eSIM']};
 await req('/api/settings',200,{...original,devices:[device]},admin);
 const line={name:'Linha Operação',number:'51999990001',carrier:'Vivo',usage:'phone',platform:'',status:'active',deviceId:device.id,slot:'eSIM',location:'',owner:'Equipe',team:'Suporte',cost:null,dueDay:null,notes:'SEGREDO_NAO_ENVIAR',version:0};
 const savedLine=(await req('/api/lines',200,line,admin)).data.line;
 await req('/api/lines',200,{...line,number:'51999990002',deviceId:null,slot:null},admin);
 const before=await req('/api/lines',200,null,admin);
 const found=await req('/api/assistant/catalog?kind=lines&query=operacao&limit=1',200,null,admin);
 assert.equal(found.data.total,2);assert.equal(found.data.needsSelection,true);assert.equal(found.data.nextOffset,1);assert.equal(found.data.items.length,1);
 assert.ok(!found.text.includes('SEGREDO_NAO_ENVIAR'));assert.ok(!found.text.includes('notes'));
 const exact=(await req('/api/assistant/catalog?kind=lines&query=%2B55%20(51)%2099999-0001',200,null,admin)).data;
 assert.equal(exact.total,1);assert.equal(exact.items[0].id,savedLine.id);assert.equal(exact.items[0].device.model,'iPhone 15');
 const dev=(await req('/api/assistant/catalog?kind=devices&query=operacao',200,null,admin)).data.items[0];
 assert.equal(dev.slots.find(s=>s.slot==='eSIM').lineId,savedLine.id);assert.equal(dev.slots.find(s=>s.slot==='Slot 1').lineId,null);
 assert.equal((await req('/api/assistant/catalog?kind=lines&query=ausente',200,null,admin)).data.total,0);
 assert.equal((await req('/api/lines',200,null,admin)).text,before.text);
 await req('/api/assistant/catalog',404,{kind:'lines'},admin);
 console.log('PASS: catálogo somente leitura, autorização, busca sem acentos/número formatado, ambiguidade, paginação, vínculos e exclusão de observações.');
 const config={apiKey:fakeKey,model:'modelo-ficticio',password};
 await req('/api/assistant',403,null,op);await req('/api/assistant/config',403,config,op);
 await req('/api/assistant/config',403,{...config,password:'incorreta'},admin);
 const saved=await req('/api/assistant/config',200,config,admin);assert.ok(!saved.text.includes(fakeKey));
 const file=join(directory,'openai-config.json');assert.equal((await stat(file)).mode&0o777,0o600);assert.equal(JSON.parse(await readFile(file,'utf8')).apiKey,fakeKey);
 const status=await req('/api/assistant',200,null,admin);assert.equal(status.data.configured,true);assert.ok(!status.text.includes(fakeKey));
 await stop();await start();assert.equal((await req('/api/assistant',200,null,admin)).data.configured,true);
 console.log('PASS: autenticação, operador bloqueado, senha incorreta, configuração privada 0600, chave ausente nas respostas e persistência após reinício. Nenhuma chamada à OpenAI.');
}finally{await stop();await rm(directory,{recursive:true,force:true});}
