import {createHash} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {mkdir, rename, rm, stat, readFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {CONTROL, SOURCE, validateRequest} from '../automation/mac-control/scripts/pedido.mjs';

export const DESCRIPTION = 'Executor privado de validação do Atlas Linhas no Mac de Lucas';
export const MARKER = {kind: 'atlas-linhas-validation', schema: 1};
export const TEMPLATE_FILES = [
  '.github/workflows/validar-mac.yml', 'AGENTS.md', 'README.md', 'atlas-control.json',
  'scripts/pedido.mjs', 'scripts/executar.mjs', 'scripts/relatorio.mjs',
];

export async function readRunnerSettings(path) {
  // The .NET runner can write an initial UTF-8 BOM, which JSON.parse rejects.
  const text = await readFile(path, 'utf8');
  const config = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!Number.isSafeInteger(config?.agentId) || config.agentId <= 0 || typeof config.gitHubUrl !== 'string') {
    throw Error('Configuração do executor incompleta. O registro existente foi preservado.');
  }
  return config;
}

export function assertPrivateRepository(repo) {
  if (repo?.full_name !== CONTROL || repo.private !== true || repo.owner?.login !== CONTROL.split('/')[0]) {
    throw Error('A automação exige o repositório privado exclusivo na conta correta.');
  }
}
export async function prepareControl(api, files) {
  let repo = await api(`repos/${CONTROL}`, 'GET', undefined, true);
  let created = false;
  if (!repo) {
    repo = await api('user/repos', 'POST', {name: CONTROL.split('/')[1], private: true, auto_init: true, description: DESCRIPTION});
    created = true;
  }
  assertPrivateRepository(repo);
  const markerFile = await api(`repos/${CONTROL}/contents/atlas-control.json`, 'GET', undefined, true);
  if (markerFile) {
    const marker = JSON.parse(Buffer.from(markerFile.content, 'base64').toString('utf8'));
    if (marker.kind !== MARKER.kind || marker.schema !== MARKER.schema || repo.default_branch !== 'main') {
      throw Error('Já existe um repositório de controle com configuração diferente. Nada foi sobrescrito.');
    }
    return {created, initialized: false};
  }
  // Allow resuming after a failed first install only for our empty, marked repository.
  if (repo.description !== DESCRIPTION) throw Error('Já existe um repositório com esse nome. Nada foi sobrescrito.');
  const branch = repo.default_branch;
  if (!/^[\w./-]+$/.test(branch)) throw Error('Branch inicial não disponível. Execute o instalador novamente.');
  const head = await api(`repos/${CONTROL}/git/ref/heads/${branch}`);
  const commit = await api(`repos/${CONTROL}/git/commits/${head.object.sha}`);
  const tree = await api(`repos/${CONTROL}/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated || tree.tree.some(item => item.path !== 'README.md')) throw Error('O repositório contém arquivos existentes sem identificação de automação. Nada foi sobrescrito.');
  if (branch !== 'main') {
    await api(`repos/${CONTROL}/git/refs`, 'POST', {ref: 'refs/heads/main', sha: head.object.sha});
    await api(`repos/${CONTROL}`, 'PATCH', {default_branch: 'main'});
  }
  const entries = TEMPLATE_FILES.map(path => {
    if (typeof files[path] !== 'string') throw Error(`Arquivo de instalação ausente: ${path}`);
    return {path, mode: '100644', type: 'blob', content: files[path]};
  });
  const nextTree = await api(`repos/${CONTROL}/git/trees`, 'POST', {base_tree: commit.tree.sha, tree: entries});
  const nextCommit = await api(`repos/${CONTROL}/git/commits`, 'POST', {
    message: 'Configurar validações privadas do Atlas Linhas no Mac', tree: nextTree.sha, parents: [head.object.sha],
  });
  await api(`repos/${CONTROL}/git/refs/heads/main`, 'PATCH', {sha: nextCommit.sha, force: false});
  return {created, initialized: true};
}

export async function requestFirstTest(api, now = new Date()) {
  const existing = await api(`repos/${CONTROL}/contents/requests/atual.json`, 'GET', undefined, true);
  if (existing) return {created: false};
  const source = await api(`repos/${SOURCE}/branches/main`);
  const pedido = validateRequest({id: `instalacao-bloco6-${now.getTime()}`, bloco: '6', sourceSha: source.commit.sha, createdAt: now.toISOString()});
  const result = await api(`repos/${CONTROL}/contents/requests/atual.json`, 'PUT', {
    message: 'Solicitar primeira validação automática: bloco 6', branch: 'main',
    content: Buffer.from(JSON.stringify(pedido, null, 2) + '\n').toString('base64'),
  });
  return {created: true, pedido, commit: result.commit.sha};
}

async function sha256(path) {
  const hash = createHash('sha256');
  for await (const part of createReadStream(path)) hash.update(part);
  return hash.digest('hex');
}
export async function downloadVerified(url, destination, expected, fetcher = fetch) {
  if (!/^https:\/\/github\.com\/(cli\/cli|actions\/runner)\/releases\/download\//.test(url) || !/^[a-f0-9]{64}$/.test(expected)) {
    throw Error('Download sem origem oficial ou checksum válido.');
  }
  await mkdir(dirname(destination), {recursive: true});
  if (await stat(destination).then(s => s.isFile()).catch(() => false)) {
    if (await sha256(destination) === expected) return;
  }
  const partial = destination + '.partial';
  await rm(partial, {force: true});
  try {
    const response = await fetcher(url, {signal: AbortSignal.timeout(300000)});
    if (!response.ok || !response.body) throw Error(`Download indisponível (HTTP ${response.status}).`);
    const hash = createHash('sha256');
    let size = 0;
    const verify = new Transform({transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > 500 * 1024 * 1024) { callback(Error('Download maior que o esperado.')); return; }
      hash.update(chunk); callback(null, chunk);
    }});
    await pipeline(Readable.fromWeb(response.body), verify, createWriteStream(partial, {mode: 0o600}));
    if (hash.digest('hex') !== expected) throw Error('Checksum diferente do esperado. Download não será executado.');
    await rename(partial, destination);
  } finally { await rm(partial, {force: true}); }
}
