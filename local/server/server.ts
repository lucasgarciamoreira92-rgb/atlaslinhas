import http from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {join,extname,resolve,sep} from 'node:path';
import {projectRoot,dataDirectory,sqlite} from './environment';
import {identityContext} from './identity';
import {authStatus,authAction,sessionIdentity,teamPost,errorResponse} from './auth';
import {accessGET,accessPOST} from './access-service';
import {vaultPOST} from './vault';
import {assistantGET,assistantPOST} from './assistant';
import {configureAssistant} from './assistant-config';
import * as lines from '@/app/api/lines/route';
import * as settings from '@/app/api/settings/route';
import * as history from '@/app/api/history/route';
import * as me from '@/app/api/me/route';
import * as team from '@/app/api/team/route';
import * as backups from '@/app/api/backups/route';
import * as restore from '@/app/api/restore/route';
import * as csv from '@/app/api/export/route';

type Handler=(req:Request)=>Promise<Response>;
const routes:Record<string,Partial<Record<string,Handler>>>={'/api/access':{GET:accessGET,POST:accessPOST},'/api/vault':{POST:vaultPOST},'/api/lines':lines,'/api/settings':settings,'/api/history':history,'/api/me':me,'/api/team':{GET:team.GET,POST:teamPost},'/api/backups':backups,'/api/restore':restore,'/api/export':csv};
const port=Number(process.env.ATLAS_PORT||4310);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('ATLAS_PORT deve estar entre 1024 e 65535.');
routes['/api/assistant']={GET:assistantGET,POST:assistantPOST};
routes['/api/assistant/config']={POST:configureAssistant};
const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
const staticRoot=join(projectRoot,'local-dist','client');
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer(async(incoming,outgoing)=>{
 try{
  if(!allowedHosts.has(incoming.headers.host||'')){outgoing.writeHead(403);outgoing.end('Host inválido. Use localhost.');return}
  const method=incoming.method||'GET',url=new URL(incoming.url||'/',`http://${incoming.headers.host}`);
  const headers=new Headers();for(const [k,v] of Object.entries(incoming.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
  if(!['GET','HEAD'].includes(method)){
   if(headers.get('origin')!==url.origin){outgoing.writeHead(403);outgoing.end('Origem inválida.');incoming.resume();return}
   if(!headers.get('content-type')?.startsWith('application/json')){outgoing.writeHead(415);outgoing.end('Envie JSON.');incoming.resume();return}
  }
  const chunks:Buffer[]=[];let length=0;const limit=url.pathname==='/api/restore'?8*1024*1024:1024*1024;
  for await(const chunk of incoming){length+=chunk.length;if(length>limit){outgoing.writeHead(413);outgoing.end('Arquivo muito grande.');return}chunks.push(chunk)}
  const req=new Request(url,{method,headers,...(['GET','HEAD'].includes(method)?{}:{body:Buffer.concat(chunks)})});
  let response:Response;
  if(url.pathname==='/api/auth/status'&&method==='GET')response=authStatus(req);
  else if(url.pathname.startsWith('/api/')){
   response=await identityContext.run(sessionIdentity(req),async()=>{
    try{if(url.pathname.startsWith('/api/auth/')&&method==='POST')return await authAction(url.pathname.slice(10),req);
     const handler=routes[url.pathname]?.[method];if(!handler)return Response.json({error:'Rota ou método não encontrado.'},{status:404});return await handler(req);
    }catch(e){return errorResponse(e)}
   });
  }else if(['GET','HEAD'].includes(method)){
   const path=resolve(staticRoot,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(!path.startsWith(staticRoot+sep))response=new Response('Não encontrado',{status:404});
   else try{if(!statSync(path).isFile())throw Error();response=new Response(new Uint8Array(readFileSync(path)),{headers:{'Content-Type':types[extname(path)]||'application/octet-stream'}})}catch{response=new Response('Não encontrado',{status:404})}
  }else response=new Response('Método não permitido',{status:405});
  response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('X-Frame-Options','DENY');response.headers.set('Referrer-Policy','no-referrer');response.headers.set('Cache-Control',url.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-store');
  response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error('[Atlas local]',e);if(!outgoing.headersSent)outgoing.writeHead(500,{'Content-Type':'application/json'});outgoing.end(JSON.stringify({error:'Falha na solicitação.'}))}
});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(port,'127.0.0.1',()=>{console.log(`Atlas Linhas disponível em http://localhost:${port}\nDados e backups: ${dataDirectory}\nPara encerrar, pressione Control+C.`)});
server.on('error',e=>{console.error('Não foi possível iniciar:',e.message);process.exitCode=1;sqlite.close()});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(()=>{sqlite.close();process.exit(0)}));
