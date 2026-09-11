const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
let user=null,failAudit=false;
const owner={userId:'owner-stable',email:'owner@example.com',displayName:'Lucas'},operator={userId:'operator-stable',email:'operator@example.com',displayName:'Operador'};
const db={prepare(query){const statement={query,args:[],bind(...args){return {...statement,args}},async first(){return sql.prepare(this.query).get(...this.args)||null},async all(){return {results:sql.prepare(this.query).all(...this.args)}},async run(){return {meta:{changes:Number(sql.prepare(this.query).run(...this.args).changes)}}}};return statement},async batch(statements){sql.exec('BEGIN');try{const results=statements.map(s=>{if(failAudit&&s.query.startsWith('INSERT INTO history'))throw Error('Simulated audit failure');return {meta:{changes:Number(sql.prepare(s.query).run(...s.args).changes)}}});sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
const cache={};function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const m={exports:{}};cache[file]=m;const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:file})(name=>name==='cloudflare:workers'?{env:{DB:db,ATLAS_OWNER_EMAIL:owner.email}}:name==='@/app/chatgpt-auth'?{getChatGPTUser:async()=>user}:name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):require(name),m,m.exports);return m.exports}
const a=load('lib/atlas.ts'),lines=load('app/api/lines/route.ts'),settings=load('app/api/settings/route.ts'),history=load('app/api/history/route.ts'),team=load('app/api/team/route.ts'),me=load('app/api/me/route.ts');
const request=(data)=>new Request('https://atlas.example/api',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://atlas.example'},body:JSON.stringify(data)});
const getHistory=(id,cursor)=>history.GET(new Request('https://atlas.example/api/history?id='+id+(cursor?'&cursor='+encodeURIComponent(cursor):'')));
const count=()=>sql.prepare('SELECT count(*) n FROM history').get().n;
(async()=>{
 for(const route of [lines,settings,team,me])assert.equal((await route.GET()).status,401);
 assert.equal((await getHistory('x')).status,401);
 assert.equal((await lines.POST(request({...a.newLine(),actor:owner}))).status,401);
 user={...operator};assert.equal((await me.GET()).status,403);assert.equal(sql.prepare('SELECT count(*) n FROM members').get().n,0);
 user=owner;assert.equal((await me.GET()).status,200);
 assert.equal((await team.POST(request({name:'Lucas',email:owner.email,active:false,version:1}))).status,409);
 assert.equal((await team.POST(request({name:'Operador',email:operator.email,active:true,version:0}))).status,200);
 let config={...a.defaultConfig,devices:[{id:'d1',name:'Suporte',model:'Modelo X',type:'android',location:'Sala 1',owner:'Lucas',slots:['Slot 1','Slot 2']}]};
 let response=await settings.POST(request(config));assert.equal(response.status,200);config=(await response.json()).config;
 user=operator;assert.equal((await me.GET()).status,200);assert.equal((await team.GET()).status,403);assert.equal((await team.POST(request({name:'Admin',email:operator.email,role:'admin',active:true,version:1}))).status,403);
 let line={...a.newLine(),name:'Suporte',number:'55999991111',carrier:'Vivo',deviceId:'d1',slot:'Slot 1',owner:'Diego'};
 response=await lines.POST(request({...line,actor:owner}));assert.equal(response.status,200);line=(await response.json()).line;
 let events=(await (await getHistory(line.id)).json()).history;assert.equal(events.length,1);assert.equal(events[0].actor.id,operator.userId);assert.equal(events[0].kind,'created');
 const n=count();assert.equal((await lines.POST(request(line))).status,200);assert.equal(count(),n);
 response=await lines.POST(request({...line,name:'Plantão',notes:'Envelope azul'}));assert.equal(response.status,200);line=(await response.json()).line;
 events=(await (await getHistory(line.id)).json()).history;assert.deepEqual(events[0].changes.map(x=>x.field).sort(),['Identificação','Observação']);assert.equal(events[0].changes[0].before,'Suporte');
 assert.equal((await lines.POST(request({...line,version:1,name:'Stale'}))).status,409);
 assert.equal((await lines.POST(request({...a.newLine(),name:'Duplicada',number:line.number,carrier:'Vivo'}))).status,409);
 response=await lines.POST(request({...a.newLine(),name:'Segunda',number:'55999992222',carrier:'Vivo',deviceId:'d1',slot:'Slot 2'}));const second=(await response.json()).line;
 const beforeMove=count();response=await settings.POST(request({...config,devices:[{...config.devices[0],location:'Sala 2'}]}));assert.equal(response.status,200);config=(await response.json()).config;assert.equal(count(),beforeMove+2);
 events=(await (await getHistory(line.id)).json()).history;assert.equal(events[0].kind,'device');assert.equal(events[0].changes[0].before,'Sala 1');assert.equal(events[0].changes[0].after,'Sala 2');
 assert.equal((await settings.POST(request({...config,devices:[{...config.devices[0],slots:['Slot 1']}]}))).status,400);
 const failedCount=count();failAudit=true;const previousError=console.error;console.error=()=>{};response=await lines.POST(request({...line,name:'Must roll back'}));console.error=previousError;failAudit=false;assert.equal(response.status,503);assert.equal(count(),failedCount);assert.equal(JSON.parse(sql.prepare('SELECT data FROM lines WHERE id=?').get(line.id).data).name,'Plantão');
 // Keyset paging must retain all entries, including more than the former 100-entry limit.
 for(let i=0;i<103;i++){response=await lines.POST(request({...line,notes:'Revisão '+i}));assert.equal(response.status,200);line=(await response.json()).line}
 let cursor=null,seen=[];do{const page=await (await getHistory(line.id,cursor)).json();seen.push(...page.history);cursor=page.nextCursor}while(cursor);
 assert.equal(new Set(seen.map(e=>e.id)).size,seen.length);assert.equal(seen.length,106);
 assert.equal(seen.find(e=>e.kind==='device').changes[0].before,'Sala 1');
 response=await lines.POST(request({...line,status:'cancelled'}));line=(await response.json()).line;assert.equal(line.deviceId,null);assert.equal(line.location,'Sala 2');
 events=(await (await getHistory(line.id)).json()).history;assert(events[0].changes.some(c=>c.field==='Situação'&&c.after==='Cancelada'));
 // Legacy records have no invented actor or current device name.
 const old={...a.newLine(),id:'legacy',name:'Antiga',carrier:'Vivo',number:'55999993333',deviceId:'d1'};
 sql.prepare('INSERT INTO history(id,line_id,version,data,created_at) VALUES(?,?,?,?,?)').run('old1','legacy',1,JSON.stringify(old),'2020-01-01T00:00:00.000Z');
 events=(await (await getHistory('legacy')).json()).history;assert.equal(events[0].actor,null);assert.equal(events[0].legacy,true);assert(!events[0].changes.some(c=>c.after==='Sala 2'));
 user=owner;assert.equal((await team.POST(request({name:'Operador',email:operator.email,active:false,version:1}))).status,200);
 user=operator;assert.equal((await lines.GET()).status,403);assert.equal((await lines.POST(request(line))).status,403);assert.equal((await getHistory(line.id)).status,403);
 console.log('Stage 4 passed: authenticated roles, blocked users, owner protection, atomic audit/rollback, device movement on all linked lines, legacy integrity, and 106-event pagination.');
})().catch(e=>{console.error(e);process.exitCode=1});
