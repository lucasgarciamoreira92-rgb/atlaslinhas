import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const config of ['local/vite.client.config.ts','local/vite.server.config.ts']){
 const r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config',config],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
