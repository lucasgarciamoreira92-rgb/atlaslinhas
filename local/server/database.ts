import {DatabaseSync, type SQLInputValue} from 'node:sqlite';
import {mkdirSync, readFileSync, readdirSync} from 'node:fs';
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
 for(const m of migrations){
  const sql=readFileSync(m.path,'utf8'), checksum=createHash('sha256').update(sql).digest('hex');
  const old=sqlite.prepare('SELECT checksum FROM local_migrations WHERE name=?').get(m.name);
  if(old){if(old.checksum!==checksum)throw Error('Migração já aplicada foi modificada: '+m.name);continue;}
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
