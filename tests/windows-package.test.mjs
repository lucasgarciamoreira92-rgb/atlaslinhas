import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createDecipheriv,pbkdf2Sync} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {prepare,seedMarker} from '../scripts/preparar-windows-com-dados.mjs';

test('gera executável privado com snapshot consistente e sem configuração da IA',async()=>{
 const root=mkdtempSync(join(tmpdir(),'atlas-win-test-'));
 try{
  const generic=join(root,'generic.exe'),data=join(root,'dados'),output=join(root,'private.exe');
  const {mkdirSync}=await import('node:fs');mkdirSync(data);writeFileSync(generic,'MZ-ficticio');
  const db=new DatabaseSync(join(data,'atlas-linhas.sqlite'));db.exec('CREATE TABLE sample(value TEXT); INSERT INTO sample VALUES (\'preservado\')');db.close();
  writeFileSync(join(data,'backup.key'),'a'.repeat(64));writeFileSync(join(data,'vault.key'),'b'.repeat(64));writeFileSync(join(data,'openai-config.json'),'nao deve entrar');writeFileSync(join(data,'atlinhas.enabled'),'1');
  await prepare(generic,data,output,'senha-segura-de-teste');
  const result=readFileSync(output),footer=result.subarray(-40),length=Number(footer.readBigUInt64LE(0));assert.deepEqual(footer.subarray(8),seedMarker);
  const envelope=JSON.parse(result.subarray(result.length-40-length,result.length-40).toString()),salt=Buffer.from(envelope.salt,'base64'),nonce=Buffer.from(envelope.nonce,'base64'),tag=Buffer.from(envelope.tag,'base64'),ciphertext=Buffer.from(envelope.ciphertext,'base64');
  const key=pbkdf2Sync('senha-segura-de-teste',salt,600_000,32,'sha256'),decipher=createDecipheriv('aes-256-gcm',key,nonce);decipher.setAAD(Buffer.from('AtlasLinhas-Windows-v1'));decipher.setAuthTag(tag);const payload=JSON.parse(Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString());
  const names=payload.files.map(file=>file.path);assert.ok(names.includes('atlas-linhas.sqlite'));assert.ok(names.includes('backup.key'));assert.ok(names.includes('vault.key'));assert.ok(!names.includes('openai-config.json'));assert.ok(!names.includes('atlinhas.enabled'));
 }finally{rmSync(root,{recursive:true,force:true})}
});
