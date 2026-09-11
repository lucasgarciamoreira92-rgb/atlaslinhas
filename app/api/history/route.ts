import {requireActor} from '@/lib/access';
import {historyEvent} from '@/lib/audit';
import {db,failure} from '@/lib/storage';
export async function GET(req:Request){try{
 await requireActor();const params=new URL(req.url).searchParams,id=params.get('id');
 if(!id||id.length>100)return Response.json({error:'Linha inválida.'},{status:400});
 let cursor:{date:string;sequence:number}|null=null;
 try{const raw=params.get('cursor');if(raw){if(raw.length>500)throw Error();cursor=JSON.parse(raw);if(!cursor||typeof cursor.date!=='string'||!Number.isSafeInteger(cursor.sequence)||cursor.sequence<1)throw Error()}}catch{return Response.json({error:'Página do histórico inválida.'},{status:400})}
 const rows=await db().prepare("SELECT h.rowid AS sequence,h.id,h.version,h.data,h.detail,h.created_at,(SELECT p.data FROM history p WHERE p.line_id=h.line_id AND p.version<h.version AND p.detail IS NULL ORDER BY p.version DESC LIMIT 1) AS previous FROM history h WHERE h.line_id=? AND (? IS NULL OR h.created_at<? OR (h.created_at=? AND h.rowid<?)) ORDER BY h.created_at DESC,h.rowid DESC LIMIT 31").bind(id,cursor?.date||null,cursor?.date||null,cursor?.date||null,cursor?.sequence||null).all<{sequence:number,id:string,version:number,data:string,detail:string|null,created_at:string,previous:string|null}>();
 const page=rows.results.slice(0,30),last=page[page.length-1];return Response.json({history:page.map(historyEvent),nextCursor:rows.results.length>30?JSON.stringify({date:last.created_at,sequence:last.sequence}):null},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e)}}
