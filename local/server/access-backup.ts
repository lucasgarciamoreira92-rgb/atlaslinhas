import {randomUUID} from 'node:crypto';
import type {Actor} from '@/lib/access';
import {AccessError} from '@/lib/access';
import type {Snapshot} from '@/lib/backup';
import {accessSnapshotSchema,defaultPolicy,type AccessSnapshot,type AccountData,type AccountPolicy} from '@/lib/accounts';
import {sqlite,db} from './environment';
import {allRows,people,validateData} from './access-service';
import {openSecret,sealSecret} from './vault';
function read(results:D1Result[]):AccessSnapshot{
 return {schema:1,people:results[0].results as AccessSnapshot['people'],accounts:(results[1].results as unknown as ReturnType<typeof allRows>).map(r=>({id:r.id,version:r.version,data:JSON.parse(r.data),policy:JSON.parse(r.policy),secret:r.secret,secretVersion:r.secret_version,createdAt:r.created_at,updatedAt:r.updated_at})),reports:results[2].results as AccessSnapshot['reports'],history:results[3].results as AccessSnapshot['history']};
}
function queries(){return [db.prepare('SELECT id,name FROM access_people ORDER BY id'),db.prepare('SELECT * FROM access_accounts ORDER BY id'),db.prepare('SELECT id,account_id AS accountId,destination_id AS destinationId,reason,status,created_at AS createdAt,author,resolved_at AS resolvedAt,resolved_by AS resolvedBy FROM access_reports ORDER BY id'),db.prepare('SELECT id,account_id AS accountId,action,created_at AS createdAt,actor,detail FROM access_history ORDER BY id')]}
async function validate(target:Snapshot){
 const source=target.access||read(await db.batch(queries())),parsed=accessSnapshotSchema.safeParse(source);if(!parsed.success)throw new AccessError('Dados de verificações ou Cofre inválidos no backup.',400);
 const personIds=new Set([...people().filter(p=>p.userId).map(p=>p.id),...source.people.map(p=>p.id)]),ids=new Set<string>();for(const p of source.people){if(ids.has(p.id)||p.id.startsWith('member:'))throw new AccessError('Responsáveis duplicados ou inválidos no backup.',400);ids.add(p.id)}ids.clear();const keys=new Set<string>();
 for(const a of source.accounts){const key=[a.data.service,a.data.login].map(s=>s.toLowerCase()).join('|');if(ids.has(a.id)||keys.has(key))throw new AccessError('Contas duplicadas no backup.',400);ids.add(a.id);keys.add(key);validateData(a.data,a.id,source.accounts,target.config,target.lines,personIds);if(a.secret)openSecret(a.id,a.secretVersion,a.secret);}
 const reportIds=new Set<string>();for(const r of source.reports){if(reportIds.has(r.id)||!ids.has(r.accountId))throw new AccessError('Pendência sem conta no backup.',400);reportIds.add(r.id)}
 for(const h of source.history){try{JSON.parse(h.detail)}catch{throw new AccessError('Histórico do Cofre inválido no backup.',400)}}
}
function restore(target:AccessSnapshot|undefined,current:AccessSnapshot|undefined,actor:Actor){if(!target)return [];const stamp=new Date().toISOString(),existing=new Map((current?.accounts||[]).map(a=>[a.id,a]));
 const statements=[db.prepare('DELETE FROM access_unlocks'),db.prepare('DELETE FROM access_reports'),db.prepare('DELETE FROM access_accounts'),db.prepare('DELETE FROM access_people')];
 for(const p of target.people)statements.push(db.prepare('INSERT INTO access_people VALUES(?,?)').bind(p.id,p.name));
 const intersection=(a:string[],b:string[])=>a.filter(v=>b.includes(v));
 for(const a of target.accounts){const old=existing.get(a.id),p=a.policy,c=old?.policy;const policy:AccountPolicy={...defaultPolicy,visibility:c?.visibility==='selected'||p.visibility==='selected'?'selected':'team',viewers:intersection(p.viewers,c?.viewers||[]),revealUsers:intersection(p.revealUsers,c?.revealUsers||[]),editUsers:intersection(p.editUsers,c?.editUsers||[]),sensitive:p.sensitive||!!c?.sensitive,quickAccess:p.quickAccess&&(c?.quickAccess??false)};
  const version=Math.max(a.version,old?.version||0)+1,secretVersion=Math.max(a.secretVersion,old?.secretVersion||0)+1,secret=a.secret?sealSecret(a.id,secretVersion,openSecret(a.id,a.secretVersion,a.secret)):null;
  statements.push(db.prepare('INSERT INTO access_accounts VALUES(?,?,?,?,?,?,?,?,?)').bind(a.id,[a.data.service,a.data.login].map(v=>v.toLowerCase()).join('|'),JSON.stringify(a.data),JSON.stringify(policy),version,secret,secretVersion,a.createdAt,stamp));
 }
 for(const r of target.reports)statements.push(db.prepare('INSERT INTO access_reports VALUES(?,?,?,?,?,?,?,?,?)').bind(r.id,r.accountId,r.destinationId,r.reason,r.status,r.createdAt,r.author,r.resolvedAt,r.resolvedBy));
 for(const h of target.history)statements.push(db.prepare('INSERT OR IGNORE INTO access_history VALUES(?,?,?,?,?,?)').bind(h.id,h.accountId,h.action,h.createdAt,h.actor,h.detail));
 for(const a of target.accounts)statements.push(db.prepare('INSERT INTO access_history VALUES(?,?,?,?,?,?)').bind(randomUUID(),a.id,'backup-restored',stamp,actor.name,JSON.stringify({actorId:actor.id,permissions:'Mantidas ou reduzidas; não ampliadas pelo backup'})));
 return statements;
}
export const accessBackup={queries,read,validate,restore};
