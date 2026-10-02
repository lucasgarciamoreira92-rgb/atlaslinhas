import {backup,DatabaseSync} from 'node:sqlite';
import {createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
import {appendFileSync,copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,statSync} from 'node:fs';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';

export const seedMarker=Buffer.alloc(32);
seedMarker.write('ATLAS_LINHAS_SEED_V1','ascii');
const associatedData=Buffer.from('AtlasLinhas-Windows-v1');

function usage(){console.error('Uso: node scripts/preparar-windows-com-dados.mjs <AtlasLinhas-generico.exe> <pasta-dados> <AtlasLinhas-com-dados.exe>');process.exit(2)}
function safeFile(path){if(!existsSync(path))return false;const s=statSync(path);return s.isFile()&&!s.isSymbolicLink()}
function walk(root,current=root,result=[]){for(const name of readdirSync(current)){const path=join(current,name),rel=relative(root,path).split(sep).join('/');if(rel==='atlas-linhas.sqlite'||rel.startsWith('atlas-linhas.sqlite-')||rel==='openai-config.json'||rel==='atlinhas.enabled'||rel.startsWith('checkpoints/'))continue;const s=statSync(path);if(s.isDirectory())walk(root,path,result);else if(s.isFile())result.push({path:rel,data:readFileSync(path).toString('base64')})}return result}
export function encrypt(clear,password){const salt=randomBytes(16),nonce=randomBytes(12),key=pbkdf2Sync(password,salt,600_000,32,'sha256'),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(associatedData);const ciphertext=Buffer.concat([cipher.update(clear),cipher.final()]),tag=cipher.getAuthTag();key.fill(0);return Buffer.from(JSON.stringify({version:1,salt:salt.toString('base64'),nonce:nonce.toString('base64'),tag:tag.toString('base64'),ciphertext:ciphertext.toString('base64')}))}
function askHidden(label){return new Promise((resolve,reject)=>{if(!process.stdin.isTTY)return reject(Error('Execute em um Terminal interativo.'));const rl=createInterface({input:process.stdin,output:process.stdout,terminal:true});process.stdout.write(label);const onData=char=>{char=String(char);switch(char){case '\n':case '\r':case '\u0004':process.stdin.off('data',onData);break;default:process.stdout.write('\x1B[2K\x1B[200D'+label+'•'.repeat(rl.line.length));}};process.stdin.on('data',onData);rl.question('',answer=>{process.stdin.off('data',onData);process.stdout.write('\n');rl.close();resolve(answer)},reject)})}

export function appendSeed(genericExe,outputExe,envelope){copyFileSync(genericExe,outputExe,0);appendFileSync(outputExe,envelope);const length=Buffer.alloc(8);length.writeBigUInt64LE(BigInt(envelope.length));appendFileSync(outputExe,length);appendFileSync(outputExe,seedMarker)}

export async function prepare(genericExe,dataDirectory,outputExe,password){
 genericExe=resolve(genericExe);dataDirectory=resolve(dataDirectory);outputExe=resolve(outputExe);
 if(!safeFile(genericExe)||!existsSync(join(dataDirectory,'atlas-linhas.sqlite')))throw Error('Confira o executável genérico e a pasta de dados informados.');
 if(existsSync(outputExe))throw Error('O arquivo de saída já existe: '+outputExe);
 const temporary=mkdtempSync(join(tmpdir(),'atlas-windows-'));
 try{
  const snapshot=join(temporary,'atlas-linhas.sqlite'),source=new DatabaseSync(join(dataDirectory,'atlas-linhas.sqlite'),{readOnly:true});
  try{await backup(source,snapshot)}finally{source.close()}
  const files=walk(dataDirectory);files.push({path:'atlas-linhas.sqlite',data:readFileSync(snapshot).toString('base64')});
  for(const required of ['backup.key','vault.key'])if(existsSync(join(dataDirectory,required))&&!files.some(file=>file.path===required))files.push({path:required,data:readFileSync(join(dataDirectory,required)).toString('base64')});
  const clear=Buffer.from(JSON.stringify({version:1,files}));const envelope=encrypt(clear,password);clear.fill(0);
  mkdirSync(dirname(outputExe),{recursive:true});appendSeed(genericExe,outputExe,envelope);
  console.log(`Executável privado criado: ${outputExe}\nBanco e chaves foram criptografados. Não envie este arquivo ao GitHub.`);
 }finally{rmSync(temporary,{recursive:true,force:true})}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==5)usage();
 const first=await askHidden('Crie uma senha para transportar os dados: '),second=await askHidden('Repita a senha: ');
 if(first.length<10)throw Error('Use pelo menos 10 caracteres na senha de migração.');if(first!==second)throw Error('As senhas não coincidem.');
 await prepare(process.argv[2],process.argv[3],process.argv[4],first);
}
