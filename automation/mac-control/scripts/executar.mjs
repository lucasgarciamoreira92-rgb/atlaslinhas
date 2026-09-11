import {spawnSync, execFileSync} from 'node:child_process';
import {realpathSync, rmSync, mkdirSync} from 'node:fs';
import {resolve, relative, isAbsolute, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {BLOCKS, CONTROL} from './pedido.mjs';

export function testArgs(block) {
  if (!Object.hasOwn(BLOCKS, block)) throw Error('Bloco não permitido.');
  return ['test', ...(BLOCKS[block] ? [BLOCKS[block]] : []), '--headed'];
}
export function assertWorkingCopy(workspace, application) {
  const distance = relative(workspace, application);
  if (distance !== 'application' || isAbsolute(distance)) throw Error('Os testes exigem a cópia application dentro do workspace do executor.');
}
function main() {
  if (process.platform !== 'darwin' || process.env.GITHUB_REPOSITORY !== CONTROL || process.env.GITHUB_REF !== 'refs/heads/main') {
    throw Error('Este comando exige o executor Mac do repositório privado.');
  }
  const root = realpathSync(process.env.GITHUB_WORKSPACE);
  const app = realpathSync(resolve(root, 'application'));
  assertWorkingCopy(root, app);
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: app, encoding: 'utf8'}).trim();
  if (sha !== process.env.ATLAS_SOURCE_SHA) throw Error('O código recebido difere do código solicitado.');
  const args = testArgs(process.env.ATLAS_TEST_BLOCK);
  // Delete only generated reports in this checked-out test copy, never user data.
  for (const name of ['playwright-report', 'test-results']) rmSync(join(app, name), {recursive: true, force: true});
  const fallbackData = join(process.env.RUNNER_TEMP, 'atlas-fallback-data');
  mkdirSync(fallbackData, {recursive: true});
  const env = {...process.env, ATLAS_DATA_DIR: fallbackData, CI: 'true', PLAYWRIGHT_HTML_OPEN: 'never'};
  delete env.GH_TOKEN; delete env.GITHUB_TOKEN; delete env.ATLAS_PORT;
  console.log('Abrindo o navegador de testes. Cada cenário usa seu próprio banco temporário.');
  const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', ...args], {cwd: app, env, stdio: 'inherit'});
  if (result.error) throw Error('Não foi possível iniciar o navegador de testes.');
  process.exitCode = result.status ?? 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
