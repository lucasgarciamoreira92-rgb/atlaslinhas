import {DatabaseSync, type SQLInputValue} from 'node:sqlite';
import {mkdirSync, readFileSync, readdirSync, existsSync, copyFileSync, writeFileSync, chmodSync, cpSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

// Minimal D1-compatible boundary, preserving the existing SQL and atomic batches.
export function openDatabase(directory:string, root:string) {
 mkdirSync(directory,{recursive:true,mode:0o700});
 const sqlite=new DatabaseSync(join(directory,'atlas-linhas.sqlite'));
 sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
 const migrations=readdirSync(join(root,'drizzle')).filter(n=>/^\d+.*\.sql$/.test(n)).sort().map(n=>({name:n,path:join(root,'drizzle',n)}));
 migrations.push({name:'local-auth-v1',path:join(root,'local','server','schema.sql')});
 const localDir=join(root,'local','server','migrations');
 if(existsSync(localDir))for(const name of readdirSync(localDir).filter(n=>/^[0-9]+.*\.sql$/.test(n)).sort())migrations.push({name:'local-'+name,path:join(localDir,name)});
 for(const m of migrations){
  const sql=readFileSync(m.path,'utf8'), checksum=createHash('sha256').update(sql).digest('hex');
  const old=sqlite.prepare('SELECT checksum FROM local_migrations WHERE name=?').get(m.name);
  if(old){if(old.checksum!==checksum)throw Error('Migração já aplicada foi modificada: '+m.name);continue;}
  if(m.name==='local-0002-access-vault.sql'&&sqlite.prepare('SELECT 1 FROM local_credentials LIMIT 1').get()){
   const checkpoint=join(directory,'checkpoints','pre-access-'+Date.now());mkdirSync(checkpoint,{recursive:true,mode:0o700});
   const file=join(checkpoint,'atlas-linhas.sqlite');sqlite.prepare('VACUUM INTO ?').run(file);chmodSync(file,0o600);
   for(const key of ['backup.key','vault.key'])if(existsSync(join(directory,key))){copyFileSync(join(directory,key),join(checkpoint,key));chmodSync(join(checkpoint,key),0o600)}
   if(existsSync(join(directory,'backups')))cpSync(join(directory,'backups'),join(checkpoint,'backups'),{recursive:true,errorOnExist:true,force:false});
   writeFileSync(join(checkpoint,'README.txt'),'Cópia anterior à migração de Verificações e Cofre. Pare o aplicativo antes de restaurar. Preserve os dados posteriores em outra cópia. Ver docs/VERIFICACOES-COFRE.md.\n',{mode:0o600});
  }
  sqlite.exec('BEGIN IMMEDIATE');
  try{sqlite.exec(sql);sqlite.prepare('INSERT INTO local_migrations VALUES(?,?)').run(m.name,checksum);sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e;}
 }
 sqlite.prepare("INSERT OR IGNORE INTO storage_revision VALUES('main',0)").run();
 class Statement {
  constructor(public sql:string,public args:SQLInputValue[]=[]){}
  bind(...args:SQLInputValue[]){return new Statement(this.sql,args)}
  execute(){const stmt=sqlite.prepare(this.sql);if(stmt.columns().length){return {results:stmt.all(...this.args),success:true,meta:{changes:0}}}const result=stmt.run(...this.args);return {results:[],success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}}}
  async all(){return this.execute()}
  async run(){return this.execute()}
  async first(){return sqlite.prepare(this.sql).get(...this.args)??null}
 }
 const database={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){sqlite.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 return {sqlite,db:database as unknown as D1Database};
}
