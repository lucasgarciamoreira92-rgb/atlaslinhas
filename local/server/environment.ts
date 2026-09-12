import {homedir} from 'node:os';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {accessBackup} from './access-backup';
import {openDatabase} from './database';

export const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const dataDirectory=resolve(process.env.ATLAS_DATA_DIR || join(homedir(),'AtlasLinhas','dados'));
export const {sqlite,db}=openDatabase(dataDirectory,projectRoot);
const backupDirectory=join(dataDirectory,'backups');mkdirSync(backupDirectory,{recursive:true,mode:0o700});
const keyPath=join(dataDirectory,'backup.key');
if(!existsSync(keyPath)){
 if(Number(sqlite.prepare('SELECT count(*) AS n FROM backups').get()!.n)>0)throw Error('backup.key ausente. Restaure a chave original da cópia da pasta de dados.');
 writeFileSync(keyPath,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});
}
const key=readFileSync(keyPath,'utf8').trim();if(!/^[0-9a-f]{64}$/.test(key))throw Error('backup.key inválida. Restaure a chave original.');
function fileFor(key:string){if(!/^backups\/[a-f0-9-]+\.json$/.test(key))throw Error('Nome de backup inválido');return join(backupDirectory,key.slice(8))}
const bucket={async put(key:string,value:string){const path=fileFor(key),temp=path+'.'+randomUUID()+'.tmp';writeFileSync(temp,value,{flag:'wx',mode:0o600});renameSync(temp,path);return {}},async get(key:string){try{const buffer=readFileSync(fileFor(key));return {body:new Uint8Array(buffer),async text(){return buffer.toString('utf8')}}}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}}};
// Used only by the local server build; never exported to the browser.
export const env={DB:db,BUCKET:bucket,ATLAS_BACKUP_KEY:key,ATLAS_ACCESS_BACKUP:accessBackup};
