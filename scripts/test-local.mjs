import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,readdir,rm,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
const directory=await mkdtemp(join(tmpdir(),'atlas-local-test-')),port=14310,base=`http://127.0.0.1:${port}`;
let child,logs='';
async function start(){logs='';child=spawn(process.execPath,['local-dist/server.mjs'],{cwd:resolve('.'),env:{...process.env,ATLAS_DATA_DIR:directory,ATLAS_PORT:String(port)},stdio:['ignore','pipe','pipe']});child.stdout.on('data',v=>logs+=v);child.stderr.on('data',v=>logs+=v);await new Promise((yes,no)=>{const timeout=setTimeout(()=>no(Error('Servidor não iniciou: '+logs)),10000);const onExit=()=>{clearTimeout(timeout);no(Error('Servidor encerrou: '+logs))};child.once('exit',onExit);child.stdout.on('data',()=>{if(logs.includes('Atlas Linhas disponível')){clearTimeout(timeout);child.off('exit',onExit);yes()}})});}
async function stop(){if(child&&child.exitCode===null){const end=once(child,'exit');child.kill('SIGTERM');await end;}}
async function req(path,{body,cookie,origin=base,status=200,headers={}}={}){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...(cookie?{Cookie:cookie}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();assert.equal(r.status,status,`${path}: ${text}`);let data;try{data=JSON.parse(text)}catch{}return {data,text,headers:r.headers,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const account={name:'Admin de teste',email:'admin@example.invalid',password:'01234567'};
let admin,operator;
try{
 await start();
 assert.equal((await req('/api/auth/status')).data.setupRequired,true);
 await req('/api/me',{status:401});await req('/api/lines',{headers:{'x-chatgpt-user-email':account.email},status:401});
 await req('/api/auth/setup',{body:account,origin:'https://outro.example',status:403});
 const setup=await req('/api/auth/setup',{body:account,status:201});admin=setup.cookie;assert.match(setup.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
 assert.equal((await req('/api/me',{cookie:admin})).data.user.role,'admin');
 await req('/api/auth/setup',{body:account,status:409});
 await req('/api/auth/login',{body:{...account,password:'senha errada'},status:401});
 const page=await req('/');assert.match(page.text,/Atlas Linhas/);const asset=page.text.match(/src="([^"]+\.js)"/)[1];assert.match((await req(asset)).headers.get('content-type'),/javascript/);await req('/dados/backup.key',{status:404});await req('/..%2f..%2fpackage.json',{status:404});
 let config=(await req('/api/settings',{cookie:admin})).data.config;
 config=(await req('/api/settings',{cookie:admin,body:{...config,devices:[{id:'iphone-test',name:'Comercial',type:'iphone',model:'iPhone 13',location:'Sala 1',owner:'Admin',slots:['Slot 1','eSIM']} ]}})).data.config;
 const input={number:'55912345678',name:'Linha de teste',carrier:'Vivo',usage:'phone',platform:'',status:'active',deviceId:'iphone-test',slot:'Slot 1',location:'',owner:'Admin',team:'TI',cost:4990,dueDay:10,notes:'Observação inicial',version:0};
 let line=(await req('/api/lines',{cookie:admin,body:input})).data.line;
 await req('/api/lines',{cookie:admin,body:input,status:409});
 await req('/api/lines',{cookie:admin,body:{...input,number:'55912345679'},status:409});
 await req('/api/settings',{cookie:admin,body:{...config,devices:[]},status:400});
 const stale=line;line=(await req('/api/lines',{cookie:admin,body:{...line,name:'Identificação revisada',notes:'Gaveta azul'}})).data.line;
 await req('/api/lines',{cookie:admin,body:{...stale,name:'Alteração velha'},status:409});
 let history=(await req('/api/history?id='+line.id,{cookie:admin})).data.history;assert.equal(history.length,2);assert.ok(history[0].changes.some(c=>c.field==='Identificação'));assert.equal(history[0].actor.email,account.email);
 config=(await req('/api/settings',{cookie:admin,body:{...config,devices:config.devices.map(d=>({...d,location:'Sala 2'}))}})).data.config;
 history=(await req('/api/history?id='+line.id,{cookie:admin})).data.history;assert.equal(history[0].kind,'device');
 await req('/api/team',{cookie:admin,body:{name:'Operador',email:'operator@example.invalid',password:'00112233',active:true,version:0}});
 operator=(await req('/api/auth/login',{body:{email:'operator@example.invalid',password:'00112233'}})).cookie;
 await req('/api/lines',{cookie:operator});await req('/api/team',{cookie:operator,status:403});await req('/api/backups',{cookie:operator,body:{},status:403});
 line=(await req('/api/lines',{cookie:operator,body:{...line,owner:'Operador'}})).data.line;assert.equal((await req('/api/history?id='+line.id,{cookie:admin})).data.history[0].actor.email,'operator@example.invalid');
 const exported=await req('/api/export',{cookie:operator});assert.match(exported.text,/Identificação revisada/);assert.match(exported.headers.get('content-type'),/csv/);
 const backupId=(await req('/api/backups',{cookie:admin,body:{}})).data.id;
 const file=(await req('/api/backups?id='+backupId,{cookie:admin})).data;assert.equal(file.payload.lines.length,1);assert.equal(file.payload.history.length,4);assert.equal('members' in file.payload,false);
 assert.ok((await readdir(join(directory,'backups'))).some(n=>n.includes(backupId)));
 const keyBefore=await readFile(join(directory,'backup.key'),'utf8');
 const tampered=structuredClone(file);tampered.payload.lines[0].name='Alterado fora';await req('/api/restore',{cookie:admin,body:{mode:'preview',file:tampered},status:400});
 let preview=(await req('/api/restore',{cookie:admin,body:{mode:'preview',file}})).data;
 line=(await req('/api/lines',{cookie:admin,body:{...line,name:'Após backup'}})).data.line;
 await req('/api/restore',{cookie:admin,body:{mode:'restore',file,token:preview.token},status:409});
 preview=(await req('/api/restore',{cookie:admin,body:{mode:'preview',file}})).data;
 const recovered=(await req('/api/restore',{cookie:admin,body:{mode:'restore',file,token:preview.token}})).data;
 assert.ok(recovered.safetyBackupId);assert.equal((await req('/api/lines',{cookie:admin})).data.lines[0].name,'Identificação revisada');
 assert.equal((await req('/api/history?id='+line.id,{cookie:admin})).data.history.length,6);
 const safety=(await req('/api/backups?id='+recovered.safetyBackupId,{cookie:admin})).data;
 preview=(await req('/api/restore',{cookie:admin,body:{mode:'preview',file:safety}})).data;
 await req('/api/restore',{cookie:admin,body:{mode:'restore',file:safety,token:preview.token}});
 assert.equal((await req('/api/lines',{cookie:admin})).data.lines[0].name,'Após backup');
 // Disk persistence: restart process, reuse a valid session, preserve key and validate old backup.
 await stop();await start();assert.equal((await req('/api/auth/status')).data.setupRequired,false);assert.equal((await req('/api/lines',{cookie:admin})).data.lines.length,1);assert.equal(await readFile(join(directory,'backup.key'),'utf8'),keyBefore);await req('/api/restore',{cookie:admin,body:{mode:'preview',file}});
 let member=(await req('/api/team',{cookie:admin})).data.members.find(m=>!m.is_owner);
 await req('/api/team',{cookie:admin,body:{...member,active:false}});await req('/api/lines',{cookie:operator,status:401});await req('/api/auth/login',{body:{email:member.email,password:'00112233'},status:401});
 member=(await req('/api/team',{cookie:admin})).data.members.find(m=>!m.is_owner);await req('/api/team',{cookie:admin,body:{...member,active:true,password:'11223344'}});
 await req('/api/auth/login',{body:{email:member.email,password:'00112233'},status:401});operator=(await req('/api/auth/login',{body:{email:member.email,password:'11223344'}})).cookie;
 const owner=(await req('/api/team',{cookie:admin})).data.members.find(m=>m.is_owner);await req('/api/team',{cookie:admin,body:{...owner,active:false},status:409});
 await req('/api/auth/password',{cookie:operator,body:{currentPassword:'errada',password:'22334455'},status:400});
 operator=(await req('/api/auth/password',{cookie:operator,body:{currentPassword:'11223344',password:'22334455'}})).cookie;await req('/api/me',{cookie:operator});
 // Multiple eSIM profiles coexist with legacy eSIM bindings.
 config=(await req('/api/settings',{cookie:admin})).data.config;
 config=(await req('/api/settings',{cookie:admin,body:{...config,devices:config.devices.map(d=>({...d,slots:['Slot 1','eSIM','eSIM 2','eSIM 3']}))}})).data.config;
 for(const [i,slot] of ['eSIM','eSIM 2','eSIM 3'].entries()){
  const created=(await req('/api/lines',{cookie:admin,body:{...input,number:'5591234578'+i,slot}})).data.line;
  assert.equal(created.slot,slot);
 }
 await req('/api/lines',{cookie:admin,body:{...input,number:'55912345789',slot:'eSIM 2'},status:409});
 await req('/api/settings',{cookie:admin,body:{...config,devices:config.devices.map(d=>({...d,slots:['Slot 1','eSIM','eSIM 3']}))},status:400});
 const multiBackup=(await req('/api/backups',{cookie:admin,body:{}})).data.id;
 const multiFile=(await req('/api/backups?id='+multiBackup,{cookie:admin})).data;
 assert.ok(multiFile.payload.lines.some(l=>l.slot==='eSIM 2'));
 // Existing lines and signed backups without a data package remain compatible.
 const legacy=(await req('/api/lines',{cookie:admin})).data.lines.find(l=>l.id===line.id);
 const legacyHistory=(await req('/api/history?id='+legacy.id,{cookie:admin})).data.history.length;
 assert.equal((await req('/api/lines',{cookie:admin,body:{...legacy,dataPackage:''}})).data.line.version,legacy.version);
 assert.equal((await req('/api/history?id='+legacy.id,{cookie:admin})).data.history.length,legacyHistory);
 // Data package: creation, validation, updates, clearing, CSV, backup recovery and restart.
 let packageLine=(await req('/api/lines',{cookie:admin,body:{...input,number:'55912345990',deviceId:null,slot:null,dataPackage:' 20 GB '}})).data.line;
 assert.equal(packageLine.dataPackage,'20 GB');
 let packageHistory=(await req('/api/history?id='+packageLine.id,{cookie:admin})).data.history;
 assert.ok(packageHistory[0].changes.some(c=>c.field==='Pacote de dados ativo'&&c.after==='20 GB'));
 await req('/api/lines',{cookie:admin,body:{...packageLine,dataPackage:'x'.repeat(101)},status:400});
 assert.equal((await req('/api/lines',{cookie:admin,body:{...packageLine,dataPackage:'20'}})).data.line.version,packageLine.version);
 const packageBackupId=(await req('/api/backups',{cookie:admin,body:{}})).data.id;
 const packageBackup=(await req('/api/backups?id='+packageBackupId,{cookie:admin})).data;
 assert.equal(packageBackup.payload.lines.find(l=>l.id===packageLine.id).dataPackage,'20 GB');
 packageLine=(await req('/api/lines',{cookie:admin,body:{...packageLine,dataPackage:'50'}})).data.line;
 packageHistory=(await req('/api/history?id='+packageLine.id,{cookie:admin})).data.history;
 assert.ok(packageHistory[0].changes.some(c=>c.field==='Pacote de dados ativo'&&c.before==='20 GB'&&c.after==='50 GB'));
 assert.equal(packageHistory[0].actor.email,account.email);assert.ok(Number.isFinite(Date.parse(packageHistory[0].date)));
 assert.equal((await req('/api/lines',{cookie:admin,body:{...packageLine,dataPackage:' 50 GB '}})).data.line.version,packageLine.version);
 packageLine=(await req('/api/lines',{cookie:admin,body:{...packageLine,dataPackage:''}})).data.line;
 assert.ok((await req('/api/history?id='+packageLine.id,{cookie:admin})).data.history[0].changes.some(c=>c.field==='Pacote de dados ativo'&&c.before==='50 GB'&&c.after==='Não informado'));
 const packagePreview=(await req('/api/restore',{cookie:admin,body:{mode:'preview',file:packageBackup}})).data;
 await req('/api/restore',{cookie:admin,body:{mode:'restore',file:packageBackup,token:packagePreview.token}});
 packageLine=(await req('/api/lines',{cookie:admin})).data.lines.find(l=>l.id===packageLine.id);assert.equal(packageLine.dataPackage,'20 GB');
 packageLine=(await req('/api/lines',{cookie:admin,body:{...packageLine,dataPackage:'Ilimitado'}})).data.line;
 const decimalLine=(await req('/api/lines',{cookie:admin,body:{...packageLine,dataPackage:'2.5'}})).data.line;assert.equal(decimalLine.dataPackage,'2,5 GB');
 packageLine=(await req('/api/lines',{cookie:admin,body:{...decimalLine,dataPackage:'Ilimitado'}})).data.line;
 const packageCsv=(await req('/api/export',{cookie:admin})).text;
 assert.ok(packageCsv.split('\r\n')[0].endsWith('"Pacote de dados ativo"'));assert.ok(packageCsv.split('\r\n').some(row=>row.endsWith('"Ilimitado"')));
 await stop();await start();
 assert.equal((await req('/api/lines',{cookie:admin})).data.lines.find(l=>l.id===packageLine.id).dataPackage,'Ilimitado');
 await req('/api/auth/logout',{cookie:admin,body:{}});await req('/api/me',{cookie:admin,status:401});
 for(let i=0;i<10;i++)await req('/api/auth/login',{body:{email:'missing@example.invalid',password:'senha-errada'},status:401});await req('/api/auth/login',{body:{email:'missing@example.invalid',password:'senha-errada'},status:429});
 await stop();
 const database=new DatabaseSync(join(directory,'atlas-linhas.sqlite'));assert.equal(database.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(database.prepare('SELECT count(*) n FROM local_migrations').get().n,4);const credential=database.prepare('SELECT password_hash FROM local_credentials LIMIT 1').get().password_hash;assert.match(credential,/^scrypt:/);assert.ok(!credential.includes(account.password));database.close();
 console.log('PASS: HTTP local, bootstrap único, sessões, CSRF, arquivos privados, cadastro, duplicidade, slots, conflitos, histórico, pacote de dados, equipe, CSV, backup em disco, recuperação e desfazer, reinício, chave preservada, bloqueio, senhas, limitação de tentativas e SQLite íntegro.');
}finally{await stop();await rm(directory,{recursive:true,force:true});}
