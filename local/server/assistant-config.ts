import {readFileSync,writeFileSync,renameSync,existsSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {dataDirectory} from './environment';
import {requireActor,AccessError} from '@/lib/access';
import {verifySessionPassword} from './auth';
const schema=z.object({apiKey:z.string().trim().min(20).max(512),model:z.string().trim().regex(/^[a-zA-Z0-9._:-]{1,100}$/)}).strict();
const file=join(dataDirectory,'openai-config.json');
export function readAssistantConfig(){
 if(existsSync(file)){try{return schema.parse(JSON.parse(readFileSync(file,'utf8')));}catch{throw new AccessError('A configuração da OpenAI não pôde ser lida. Confira o arquivo local.',503);}}
 return {apiKey:process.env.OPENAI_API_KEY?.trim()||'',model:process.env.ATLAS_OPENAI_MODEL?.trim()||''};
}
export async function configureAssistant(req:Request){
 await requireActor(true);
 const input=z.object({apiKey:z.string().max(512),model:z.string().max(100),password:z.string().max(128)}).strict().parse(await req.json());
 await verifySessionPassword(req,input.password);await requireActor(true);
 const config=schema.parse({apiKey:input.apiKey,model:input.model});
 const temp=file+'.'+randomUUID()+'.tmp';
 try{writeFileSync(temp,JSON.stringify(config),{flag:'wx',mode:0o600});renameSync(temp,file);}catch{if(existsSync(temp))unlinkSync(temp);throw new AccessError('Não foi possível salvar a configuração local.',500);}
 return Response.json({configured:true,model:config.model});
}
