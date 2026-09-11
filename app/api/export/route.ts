import {requireActor} from '@/lib/access';
import {db,failure} from '@/lib/storage';
import {defaultConfig,type Line,type Config} from '@/lib/atlas';
import {exportCsv} from '@/lib/export';
export async function GET(){try{await requireActor();const results=await db().batch([db().prepare('SELECT data FROM lines ORDER BY number'),db().prepare("SELECT data FROM settings WHERE id='main'")]);const lines=(results[0].results as {data:string}[]).map(r=>JSON.parse(r.data) as Line),row=results[1].results[0] as {data:string}|undefined,config=row?JSON.parse(row.data) as Config:defaultConfig;return new Response(exportCsv(lines,config),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="atlas-linhas-${new Date().toISOString().slice(0,10)}.csv"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}catch(e){return failure(e)}}
