import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({resolve:{alias:[{find:'cloudflare:workers',replacement:root+'local/server/environment.ts'},{find:'@/app/chatgpt-auth',replacement:root+'local/server/identity.ts'},{find:'@',replacement:root}]},ssr:{noExternal:true},build:{ssr:root+'local/server/server.ts',outDir:root+'local-dist',emptyOutDir:false,rollupOptions:{output:{entryFileNames:'server.mjs'}}}});
