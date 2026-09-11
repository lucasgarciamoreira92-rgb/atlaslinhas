const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
let user=null,failAudit=false,failBucket=false,beforeBatch=null;const objects=new Map();const storage={async put(key,value){if(failBucket)throw Error('Storage unavailable');objects.set(key,value)},async get(key){const value=objects.get(key);return value===undefined?null:{body:new Response(value).body,text:async()=>value}},async delete(key){objects.delete(key)}};
const owner={userId:'owner-stable',email:'owner@example.com',displayName:'Lucas'},operator={userId:'operator-stable',email:'operator@example.com',displayName:'Operador'};
const db={prepare(query){const statement={query,args:[],bind(...args){return {...statement,args}},async first(){return sql.prepare(this.query).get(...this.args)||null},async all(){return {results:sql.prepare(this.query).all(...this.args)}},async run(){return {meta:{changes:Number(sql.prepare(this.query).run(...this.args).changes)}}}};return statement},async batch(statements){if(beforeBatch){const callback=beforeBatch;beforeBatch=null;callback()}sql.exec('BEGIN');try{const results=statements.map(s=>{if(failAudit&&/^INSERT(?: OR IGNORE)? INTO history/.test(s.query))throw Error('Simulated audit failure');const statement=sql.prepare(s.query);return statement.columns().length?{results:statement.all(...s.args),meta:{changes:0}}:{results:[],meta:{changes:Number(statement.run(...s.args).changes)}}});sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
const cache={};function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const m={exports:{}};cache[file]=m;const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:file})(name=>name==='cloudflare:workers'?{env:{DB:db,ATLAS_OWNER_EMAIL:owner.email,ATLAS_BACKUP_KEY:'test-key-only',BUCKET:storage}}:name==='@/app/chatgpt-auth'?{getChatGPTUser:async()=>user}:name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):require(name),m,m.exports);return m.exports}
const a=load('lib/atlas.ts'),lines=load('app/api/lines/route.ts'),settings=load('app/api/settings/route.ts'),history=load('app/api/history/route.ts'),team=load('app/api/team/route.ts'),me=load('app/api/me/route.ts');
const request=(data)=>new Request('https://atlas.example/api',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://atlas.example'},body:JSON.stringify(data)});
const getHistory=(id,cursor)=>history.GET(new Request('https://atlas.example/api/history?id='+id+(cursor?'&cursor='+encodeURIComponent(cursor):'')));
const count=()=>sql.prepare('SELECT count(*) n FROM history').get().n;

const backup=load('lib/backup.ts'),backups=load('app/api/backups/route.ts'),recovery=load('app/api/restore/route.ts'),csv=load('app/api/export/route.ts');
const listBackups=()=>backups.GET(new Request('https://atlas.example/api/backups'));
const capture=async()=>{const r=await backups.POST(request({}));assert.equal(r.status,200);const d=await r.json();const download=await backups.GET(new Request('https://atlas.example/api/backups?id='+d.id));assert.equal(download.status,200);return await download.json()};
const preview=async(file)=>{const r=await recovery.POST(request({mode:'preview',file}));assert.equal(r.status,200);return r.json()};
(async()=>{
 assert.equal((await listBackups()).status,401);assert.equal((await csv.GET()).status,401);
 user=owner;await me.GET();await team.POST(request({name:'Operador',email:operator.email,active:true,version:0}));
 user=operator;assert.equal((await backups.POST(request({}))).status,403);assert.equal((await recovery.POST(request({mode:'restore'}))).status,403);
 user=owner;
 let config={...a.defaultConfig,devices:[{id:'d1',name:'Operações',model:'Modelo X',type:'android',location:'Sala A',owner:'Lucas',slots:['Slot 1']}]};
 config=(await (await settings.POST(request(config))).json()).config;
 let line=(await (await lines.POST(request({...a.newLine(),name:'=HYPERLINK("example")',number:'55999991111',carrier:'Vivo',deviceId:'d1',slot:'Slot 1',cost:0}))).json()).line;
 const original=await capture();assert.equal(original.payload.lines.length,1);assert.equal(original.payload.history.length,1);assert(!('members' in original.payload));assert.equal(await backup.verify(original.payload,original.signature),true);
 const exported=await csv.GET();assert.equal(exported.status,200);const text=await exported.text();assert(text.includes("'="));assert(text.includes('0,00'));assert(text.includes('Sala A'));
 line=(await (await lines.POST(request({...line,name:'Novo nome',notes:'Envelope azul'}))).json()).line;
 const other=(await (await lines.POST(request({...a.newLine(),name:'Outra linha',number:'55999992222',carrier:'Claro'}))).json()).line;
 const changed=structuredClone(original);changed.payload.lines[0].owner='Tampered';assert.equal((await recovery.POST(request({mode:'preview',file:changed}))).status,400);
 assert.equal((await recovery.POST(request({mode:'restore',file:original}))).status,400);
 let p=await preview(original);assert.equal(p.summary.removed,1);assert.equal(p.summary.changed,1);assert.equal(p.summary.backupLines,1);
 // An operator update after review invalidates the confirmation.
 line=(await (await lines.POST(request({...line,notes:'After review'}))).json()).line;
 assert.equal((await recovery.POST(request({mode:'restore',file:original,token:p.token}))).status,409);
 p=await preview(original);failBucket=true;let log=console.error;console.error=()=>{};let r=await recovery.POST(request({mode:'restore',file:original,token:p.token}));console.error=log;failBucket=false;assert.equal(r.status,503);assert.equal(sql.prepare('SELECT count(*) n FROM lines').get().n,2);
 // Roll back all data if an audit insert fails partway through restore.
 p=await preview(original);const beforeFailure=await backup.snapshot();failAudit=true;console.error=()=>{};r=await recovery.POST(request({mode:'restore',file:original,token:p.token}));console.error=log;failAudit=false;assert.equal(r.status,503);let afterFailure=await backup.snapshot();assert.deepEqual(afterFailure.lines,beforeFailure.lines);assert.deepEqual(afterFailure.history,beforeFailure.history);
 // Simulate a concurrent write between the revision check and the restoring batch.
 const live=await backup.snapshot(),safety=await backup.storeBackup(await backup.envelope(live),{id:owner.userId,name:'Lucas',email:owner.email,role:'admin'},'before-restore');beforeBatch=()=>sql.prepare('UPDATE lines SET version=version+1 WHERE id=?').run(other.id);
 await assert.rejects(()=>backup.restore(original.payload,live,safety,{id:owner.userId,name:'Lucas',email:owner.email,role:'admin'}),e=>e.status===409);assert.equal(sql.prepare('SELECT count(*) n FROM lines').get().n,2);
 p=await preview(original);const beforeSuccess=await backup.snapshot();r=await recovery.POST(request({mode:'restore',file:original,token:p.token}));assert.equal(r.status,200);const result=await r.json();
 const after=await backup.snapshot();assert.equal(after.lines.length,1);assert.equal(after.lines[0].name,original.payload.lines[0].name);assert(after.lines[0].version>line.version);assert(after.config.version>config.version);assert(after.history.length>beforeSuccess.history.length);assert(beforeSuccess.history.every(h=>after.history.some(x=>x.id===h.id&&x.data===h.data&&x.detail===h.detail)));
 const saved=await backups.GET(new Request('https://atlas.example/api/backups?id='+result.safetyBackupId));const safetyFile=await saved.json();assert.equal(safetyFile.payload.lines.length,2);assert.equal(safetyFile.payload.lines.find(l=>l.id===line.id).name,'Novo nome');
 assert.equal((await lines.POST(request(line))).status,409);assert.equal((await recovery.POST(request({mode:'restore',file:original,token:p.token}))).status,409);
 // Recover the automatic safety copy to undo the prior recovery.
 p=await preview(safetyFile);r=await recovery.POST(request({mode:'restore',file:safetyFile,token:p.token}));assert.equal(r.status,200);assert.equal((await backup.snapshot()).lines.length,2);
 assert.equal(sql.prepare("SELECT count(*) n FROM members WHERE active=1").get().n,2);
 const empty=await backup.envelope({...await backup.snapshot(),lines:[],config:a.defaultConfig,history:[]});p=await preview(empty);assert.equal(p.summary.removed,2);r=await recovery.POST(request({mode:'restore',file:empty,token:p.token}));assert.equal(r.status,200);const emptyResult=await r.json();assert.equal((await backup.snapshot()).lines.length,0);assert((await backup.snapshot()).history.length>0);const undoEmpty=await (await backups.GET(new Request('https://atlas.example/api/backups?id='+emptyResult.safetyBackupId))).json();p=await preview(undoEmpty);r=await recovery.POST(request({mode:'restore',file:undoEmpty,token:p.token}));assert.equal(r.status,200);assert.equal((await backup.snapshot()).lines.length,2);
 console.log('Stage 5 passed: signed backup round-trip, CSV escaping, admin-only recovery, tamper rejection, stale confirmations, concurrent writes, storage failure, atomic rollback, preserved history/access and recovery of the automatic safety copy.');
})().catch(e=>{console.error(e);process.exitCode=1});
