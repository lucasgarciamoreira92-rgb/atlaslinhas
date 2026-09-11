import {spawnSync} from 'node:child_process';
import {readFile, writeFile, mkdir, access, readdir, copyFile, chmod, open, rm} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join, dirname, delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {CONTROL, LABEL} from '../automation/mac-control/scripts/pedido.mjs';
import {TEMPLATE_FILES, prepareControl, requestFirstTest, downloadVerified, assertPrivateRepository} from './automacao-mac-core.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = join(homedir(), 'Library', 'Application Support', 'AtlasLinhasAutomacao');
const runner = join(base, 'runner');
const bin = join(base, 'bin');
const gh = join(bin, 'gh');
const owner = CONTROL.split('/')[0];
const exists = path => access(path).then(() => true, () => false);
const url = `https://github.com/${CONTROL}`;
const ghChecksums = {
  arm64: '45f9a62da2f6e641a7fad57e2ce39656dfd7ef331372d80a2a2aed65abb01642',
  amd64: 'fcd7799e85eb575f3c7d2b1679bfbfedaefa1269d4bc7d096b51e10939b4812b',
};
const runnerChecksums = {
  arm64: '5a2cd92908a93d7276a194e1de6008099f3e7946f3f8e14aa7a1a7b4a31fdec2',
  x64: 'd383f505d7ed041b1873ab68c35dd766fc093f2252330f95bb427be8f2c6dcfc',
};

function run(command, args, label, options = {}) {
  const result = spawnSync(command, args, {cwd: root, stdio: 'inherit', ...options});
  if (result.error || result.status !== 0) throw Error(`${label} não foi concluído. Corrija a mensagem acima e execute o instalador novamente.`);
  return result;
}
function api(endpoint, method = 'GET', body, missingOk = false) {
  const args = ['api', '--hostname', 'github.com', '--method', method, '-H', 'Accept: application/vnd.github+json', endpoint];
  if (body !== undefined) args.push('--input', '-');
  const result = spawnSync(gh, args, {encoding: 'utf8', input: body === undefined ? undefined : JSON.stringify(body), maxBuffer: 8 * 1024 * 1024});
  if (result.error || result.status !== 0) {
    const status = result.stderr?.match(/HTTP (\d{3})/)?.[1];
    if (missingOk && status === '404') return null;
    // Do not print payloads, registration tokens or captured responses on failures.
    throw Error(`GitHub não concluiu ${method} ${endpoint}${status ? ` (HTTP ${status})` : ''}. Confira o login e as permissões da conta.`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}
async function installGh(arch) {
  if (await exists(gh)) return;
  console.log('Preparando o cliente oficial do GitHub...');
  const name = `gh_2.100.0_macOS_${arch}`;
  const archive = join(base, 'downloads', name + '.zip');
  await downloadVerified(`https://github.com/cli/cli/releases/download/v2.100.0/${name}.zip`, archive, ghChecksums[arch]);
  const expanded = join(base, 'downloads', name);
  await mkdir(expanded, {recursive: true});
  run('/usr/bin/ditto', ['-x', '-k', archive, expanded], 'Extração do GitHub CLI');
  const candidates = [join(expanded, 'bin', 'gh')];
  for (const item of await readdir(expanded, {withFileTypes: true})) if (item.isDirectory()) candidates.push(join(expanded, item.name, 'bin', 'gh'));
  const executable = (await Promise.all(candidates.map(async path => await exists(path) ? path : null))).find(Boolean);
  if (!executable) throw Error('O pacote do GitHub CLI não contém o executável esperado.');
  await mkdir(bin, {recursive: true}); await copyFile(executable, gh); await chmod(gh, 0o755);
}
function authenticate() {
  const status = spawnSync(gh, ['auth', 'status', '--hostname', 'github.com', '--active'], {stdio: 'ignore'});
  if (status.status !== 0) {
    console.log(`Autorize o GitHub no navegador com a conta ${owner}. Essa vinculação é feita uma vez.`);
    run(gh, ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web', '--scopes', 'repo,workflow'], 'Login no GitHub');
  }
  const profile = api('user');
  if (profile.login !== owner) throw Error(`A conta ativa é ${profile.login}. Selecione ${owner} no GitHub CLI antes de continuar.`);
  // Existing OAuth logins may not have the workflow scope needed to publish the installer template.
  const headers = spawnSync(gh, ['api', '--hostname', 'github.com', '--include', 'user'], {encoding: 'utf8'});
  const scopes = headers.stdout?.match(/^x-oauth-scopes:\s*(.*)$/im)?.[1];
  if (scopes !== undefined && !scopes.split(',').map(s => s.trim()).includes('workflow')) {
    console.log('O GitHub pedirá autorização para gravar o fluxo de testes.');
    run(gh, ['auth', 'refresh', '--hostname', 'github.com', '--scopes', 'repo,workflow'], 'Autorização dos workflows');
  }
}
async function unpackRunner(arch) {
  await mkdir(runner, {recursive: true});
  const name = `actions-runner-osx-${arch}-2.337.0.tar.gz`;
  const archive = join(base, 'downloads', name);
  await downloadVerified(`https://github.com/actions/runner/releases/download/v2.337.0/${name}`, archive, runnerChecksums[arch]);
  run('/usr/bin/tar', ['-xzf', archive, '-C', runner], 'Extração do executor');
}
async function installRunner(arch) {
  if (await exists(join(runner, '.runner'))) {
    const config = JSON.parse(await readFile(join(runner, '.runner'), 'utf8'));
    if (config.gitHubUrl?.replace(/\/$/, '') !== url) throw Error('Esta pasta já pertence a outro executor. Nada foi alterado.');
    return config;
  }
  console.log('Preparando o executor oficial do GitHub...');
  await unpackRunner(arch);
  const registration = api(`repos/${CONTROL}/actions/runners/registration-token`, 'POST');
  if (!registration?.token) throw Error('O GitHub não forneceu a autorização temporária do executor.');
  const env = {...process.env, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH || ''}`, ACTIONS_RUNNER_INPUT_TOKEN: registration.token};
  try {
    run('/bin/bash', ['./config.sh', '--unattended', '--url', url, '--name', 'atlas-linhas-mac-lucas', '--labels', LABEL, '--work', '_work'],
      'Registro do executor', {cwd: runner, env});
  } finally { delete env.ACTIONS_RUNNER_INPUT_TOKEN; registration.token = ''; }
  return JSON.parse(await readFile(join(runner, '.runner'), 'utf8'));
}
async function startService() {
  if (!await exists(join(runner, '.service'))) run('/bin/bash', ['./svc.sh', 'install'], 'Instalação do serviço', {cwd: runner});
  run('/bin/bash', ['./svc.sh', 'start'], 'Inicialização do executor', {cwd: runner});
  run('/bin/bash', ['./svc.sh', 'status'], 'Conferência do serviço', {cwd: runner});
}
async function main() {
  if (process.platform !== 'darwin') throw Error('Este instalador deve ser executado no Mac de Lucas.');
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Use Node.js 24 ou superior.');
  if (process.getuid?.() === 0) throw Error('Execute com seu usuário normal do Mac, sem sudo.');
  const action = process.argv[2] || 'instalar';
  if (!['instalar', 'status', 'parar', 'iniciar', 'desinstalar', 'verificar-ferramentas'].includes(action)) throw Error('Use instalar, status, parar, iniciar ou desinstalar.');
  process.umask(0o077);
  await mkdir(base, {recursive: true});
  const lockPath = join(base, 'instalacao.lock');
  if (await exists(lockPath)) {
    const pid = Number(await readFile(lockPath, 'utf8'));
    let running = true;
    try { process.kill(pid, 0); } catch (error) { running = error.code !== 'ESRCH'; }
    if (!Number.isInteger(pid) || pid <= 0 || running) throw Error('Outra configuração está em andamento. Aguarde sua conclusão.');
    await rm(lockPath);
  }
  const lock = await open(lockPath, 'wx', 0o600);
  await lock.writeFile(String(process.pid)); await lock.close();
  try {
    if (!['instalar', 'verificar-ferramentas'].includes(action)) {
      if (!await exists(join(runner, '.runner'))) throw Error('Executor ainda não configurado.');
      const config = JSON.parse(await readFile(join(runner, '.runner'), 'utf8'));
      if (config.gitHubUrl?.replace(/\/$/, '') !== url) throw Error('A pasta pertence a outro executor.');
      const operation = {status: 'status', parar: 'stop', iniciar: 'start', desinstalar: 'stop'}[action];
      run('/bin/bash', ['./svc.sh', operation], 'Gerenciamento do serviço', {cwd: runner});
      if (action === 'desinstalar') {
        run('/bin/bash', ['./svc.sh', 'uninstall'], 'Remoção da inicialização automática', {cwd: runner});
        console.log(`Inicialização automática removida. O registro pode ser removido em ${url}/settings/actions/runners`);
      }
      return;
    }
    const architecture = spawnSync('/usr/bin/uname', ['-m'], {encoding: 'utf8'}).stdout.trim();
    if (!['arm64', 'x86_64'].includes(architecture)) throw Error('Arquitetura do Mac não reconhecida.');
    run('/usr/bin/git', ['--version'], 'Git');
    await installGh(architecture === 'arm64' ? 'arm64' : 'amd64');
    if (action === 'verificar-ferramentas') {
      // CI smoke check: no authentication, repository creation, registration or service installation.
      if (await exists(join(runner, '.runner'))) throw Error('Conferência de binários exige uma pasta sem executor registrado.');
      await unpackRunner(architecture === 'arm64' ? 'arm64' : 'x64');
      run(gh, ['--version'], 'Verificação do GitHub CLI');
      run('/bin/bash', ['./config.sh', '--version'], 'Verificação do executor', {cwd: runner});
      console.log('Binários oficiais baixados, verificados e executados no macOS. Nenhum executor foi registrado.');
      return;
    }
    authenticate();
    const files = Object.fromEntries(await Promise.all(TEMPLATE_FILES.map(async file => [file, await readFile(join(root, 'automation/mac-control', file), 'utf8')])));
    console.log('Preparando o repositório privado de validação...');
    const prepared = await prepareControl(api, files);
    console.log(prepared.initialized ? 'Fluxo privado publicado.' : 'Fluxo privado existente preservado.');
    const config = await installRunner(architecture === 'arm64' ? 'arm64' : 'x64');
    await startService();
    let online = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const current = api(`repos/${CONTROL}/actions/runners/${config.agentId}`);
      if (current.status === 'online') { online = true; break; }
      await delay(2000);
    }
    if (!online) throw Error(`O serviço foi instalado, mas ainda não apareceu online. Confira ${url}/settings/actions/runners e execute novamente.`);
    assertPrivateRepository(api(`repos/${CONTROL}`));
    const first = await requestFirstTest(api);
    await writeFile(join(base, 'estado.json'), JSON.stringify({repository: CONTROL, runnerId: config.agentId, configuredAt: new Date().toISOString(), firstRequest: first.pedido?.id ?? null}, null, 2));
    console.log('\nExecutor conectado e pronto para receber testes.');
    console.log(first.created ? 'Primeira validação do bloco 6 solicitada automaticamente. O navegador abrirá após a preparação.' : 'Pedido existente preservado. Nenhum teste foi repetido pela reinstalação.');
    console.log(`Acompanhe: ${url}/actions`);
    console.log('Você pode fechar este Terminal. Mantenha o Mac acordado e com sua sessão aberta durante os testes.');
    console.log('Volte à conversa e informe: executor conectado.');
    console.log('Se a conexão GitHub do ChatGPT usa repositórios selecionados, inclua atlaslinhas-validacao-mac nas permissões dela.');
    spawnSync('/usr/bin/open', [`${url}/actions`], {stdio: 'ignore'});
  } finally { await rm(lockPath, {force: true}); }
}
main().catch(error => { console.error(`\n${error.message}`); process.exitCode = 1; });
