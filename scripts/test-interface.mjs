import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const blocks = {'6': 'bloco-6-acessos.spec.ts', '7': 'bloco-7-arquivos.spec.ts', regressao: 'regressao.spec.ts', todos: ''};
const block = args.find(a => !a.startsWith('--')) || 'todos';
if (!(block in blocks) || args.some(a => a.startsWith('--') && !['--headed', '--ui'].includes(a))) {
  console.error('Uso: node scripts/test-interface.mjs [6|7|regressao|todos] [--headed|--ui]');
  process.exit(1);
}
function run(file, params) {
  const result = spawnSync(process.execPath, [file, ...params], {cwd: root, stdio: 'inherit'});
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}
console.log('Atlas: testes com dados fictícios, banco temporário e porta exclusiva.');
const built = run('scripts/build-local.mjs', []);
if (built) process.exit(built);
const code = run('node_modules/@playwright/test/cli.js', ['test', ...(blocks[block] ? [blocks[block]] : []), ...args.filter(a => a.startsWith('--'))]);
console.log('\nPara ver o relatório: npm run test:relatorio');
process.exit(code);
