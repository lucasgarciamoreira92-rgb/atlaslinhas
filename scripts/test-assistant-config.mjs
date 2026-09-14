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
 const config={apiKey:fakeKey,model:'modelo-ficticio',password};
 await req('/api/assistant',403,null,op);await req('/api/assistant/config',403,config,op);
 await req('/api/assistant/config',403,{...config,password:'incorreta'},admin);
 const saved=await req('/api/assistant/config',200,config,admin);assert.ok(!saved.text.includes(fakeKey));
 const file=join(directory,'openai-config.json');assert.equal((await stat(file)).mode&0o777,0o600);assert.equal(JSON.parse(await readFile(file,'utf8')).apiKey,fakeKey);
 const status=await req('/api/assistant',200,null,admin);assert.equal(status.data.configured,true);assert.ok(!status.text.includes(fakeKey));
 await stop();await start();assert.equal((await req('/api/assistant',200,null,admin)).data.configured,true);
 console.log('PASS: autenticação, operador bloqueado, senha incorreta, configuração privada 0600, chave ausente nas respostas e persistência após reinício. Nenhuma chamada à OpenAI.');
}finally{await stop();await rm(directory,{recursive:true,force:true});}
