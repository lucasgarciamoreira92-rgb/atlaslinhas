// Recovery from the local machine only; no API that can reset the owner account.
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {randomBytes,scrypt} from 'node:crypto';
import {promisify} from 'node:util';
if(!process.stdin.isTTY){console.error('Execute no Terminal do Mac, com o Atlas Linhas parado.');process.exit(1)}
let hidden=false;
const output=new Writable({write(chunk,encoding,callback){if(!hidden)process.stdout.write(chunk,encoding);callback()}});
const rl=createInterface({input:process.stdin,output,terminal:true});let db;
try{
 console.log('Pare a aplicação antes de redefinir uma senha. Os dados e o histórico serão preservados.');
 const email=(await rl.question('E-mail cadastrado: ')).trim().toLowerCase();
 process.stdout.write('Nova senha (mínimo 8 caracteres, entrada oculta): ');hidden=true;const password=await rl.question('');hidden=false;process.stdout.write('\n');
 process.stdout.write('Repita a senha: ');hidden=true;const confirm=await rl.question('');hidden=false;process.stdout.write('\n');
 if(password.length<8||password.length>128||password!==confirm)throw Error('Senhas diferentes ou tamanho inválido.');
 const directory=resolve(process.env.ATLAS_DATA_DIR||join(homedir(),'AtlasLinhas','dados'));
 if(!existsSync(join(directory,'atlas-linhas.sqlite')))throw Error('Banco local não encontrado. Confira ATLAS_DATA_DIR.');
 db=new DatabaseSync(join(directory,'atlas-linhas.sqlite'),{open:true});db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;');
 const user=db.prepare('SELECT user_id FROM members WHERE email=? AND active=1').get(email);if(!user)throw Error('Usuário ativo não encontrado.');
 const salt=randomBytes(16).toString('hex'),hash=await promisify(scrypt)(password,salt,64);
 db.exec('BEGIN IMMEDIATE');try{const result=db.prepare('UPDATE local_credentials SET password_hash=? WHERE user_id=?').run(`scrypt:${salt}:${hash.toString('hex')}`,user.user_id);if(!result.changes)throw Error('Credencial local não encontrada.');db.prepare('DELETE FROM local_sessions WHERE user_id=?').run(user.user_id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 console.log('Senha redefinida e sessões encerradas. Inicie novamente a aplicação.');
}catch(e){console.error(e.message);process.exitCode=1}finally{hidden=false;rl.close();db?.close()}
