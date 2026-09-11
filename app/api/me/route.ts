import {requireActor} from '@/lib/access';
import {failure} from '@/lib/storage';
export async function GET(){try{return Response.json({user:await requireActor()},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
