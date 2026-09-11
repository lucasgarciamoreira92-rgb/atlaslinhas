import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {CONTROL, SOURCE, validateRequest, assertControlEvent, assertSourceOnMain} from '../../automation/mac-control/scripts/pedido.mjs';
import {testArgs, assertWorkingCopy} from '../../automation/mac-control/scripts/executar.mjs';
import {summarize, markdown} from '../../automation/mac-control/scripts/relatorio.mjs';
import {prepareControl, requestFirstTest, downloadVerified, DESCRIPTION, MARKER, TEMPLATE_FILES} from '../../scripts/automacao-mac-core.mjs';

const sha = 'a'.repeat(40);
const pedido = {id: 'bloco6-teste-1', bloco: '6', sourceSha: sha, createdAt: '2026-09-11T21:00:00.000Z'};
const event = {repository: {full_name: CONTROL, private: true}};
const env = {GITHUB_REPOSITORY: CONTROL, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push'};
const owner = CONTROL.split('/')[0];
const repo = {full_name: CONTROL, owner: {login: owner}, private: true, description: DESCRIPTION, default_branch: 'main'};

test('pedidos aceitam somente blocos e SHA fixos, recusando comandos e injeções', () => {
  assert.deepEqual(validateRequest(pedido), pedido);
  for (const invalid of [
    {...pedido, command: 'anything'}, {...pedido, bloco: '6; open anything'}, {...pedido, bloco: '__proto__'},
    {...pedido, sourceSha: 'main'}, {...pedido, id: 'id\nbloco=7'}, {...pedido, bloco: 6},
    {...pedido, createdAt: '2026-02-31T21:00:00.000Z'}, {...pedido, createdAt: null},
  ]) assert.throws(() => validateRequest(invalid));
  assert.deepEqual(testArgs('6'), ['test', 'bloco-6-acessos.spec.ts', '--headed']);
  assert.deepEqual(testArgs('todos'), ['test', '--headed']);
  assert.throws(() => testArgs('constructor'));
});

test('somente a main privada chega ao executor, nunca PR ou repositório público', () => {
  assert.doesNotThrow(() => assertControlEvent(event, env));
  for (const badEnv of [{...env, GITHUB_EVENT_NAME: 'pull_request'}, {...env, GITHUB_REF: 'refs/heads/test'}, {...env, GITHUB_REPOSITORY: SOURCE}]) {
    assert.throws(() => assertControlEvent(event, badEnv));
  }
  assert.throws(() => assertControlEvent({repository: {...event.repository, private: false}}, env));
});

test('commit precisa fazer parte da main: divergência, SHA diferente e falha HTTP bloqueiam', async () => {
  for (const status of ['identical', 'ahead']) await assertSourceOnMain(sha, async url => {
    assert.equal(url, `https://api.github.com/repos/${SOURCE}/compare/${sha}...main`);
    return Response.json({status, base_commit: {sha}});
  });
  for (const status of ['behind', 'diverged']) await assert.rejects(assertSourceOnMain(sha, async () => Response.json({status, base_commit: {sha}})));
  await assert.rejects(assertSourceOnMain(sha, async () => Response.json({status: 'identical', base_commit: {sha: 'b'.repeat(40)}})));
  await assert.rejects(assertSourceOnMain(sha, async () => new Response('', {status: 403})));
});

test('execução exige cópia própria, recusa aplicação real e caminhos vizinhos', () => {
  assertWorkingCopy('/runner/work', '/runner/work/application');
  for (const location of ['/Users/lucas/atlaslinhas', '/runner/work', '/runner/work-evil/application', '/runner/work/application/sub']) {
    assert.throws(() => assertWorkingCopy('/runner/work', location));
  }
});

test('relatório distingue aprovação, falha, ignorados e ausência de execução', () => {
  const report = status => ({suites: [{suites: [{specs: [{title: 'Acessos', tests: [{status, results: [{duration: 10}]}]}]}]}], errors: []});
  assert.equal(summarize(report('expected'), 'success', {}).resultado, 'aprovado');
  for (const status of ['unexpected', 'skipped', 'flaky']) assert.notEqual(summarize(report(status), 'success', {}).resultado, 'aprovado');
  assert.equal(summarize(null, 'skipped', {}).resultado, 'não executado');
  assert.equal(summarize({suites: []}, 'success', {}).resultado, 'não executado');
  assert.notEqual(summarize(report('expected'), 'failure', {}).resultado, 'aprovado');
  assert.notEqual(summarize({...report('expected'), errors: [{message: 'interrompido'}]}, 'success', {}).resultado, 'aprovado');
  assert.match(markdown(summarize(null, 'skipped', {pedido: 'teste', bloco: '6'})), /não chegaram a produzir resultados/);
});

test('instalação nunca converte repositório público e não sobrescreve controle existente', async () => {
  const requests = [];
  await assert.rejects(prepareControl(async (endpoint, method = 'GET') => {
    requests.push(method); return {...repo, private: false};
  }, {}));
  assert.deepEqual(requests, ['GET']);
  const calls = [];
  const existing = await prepareControl(async (endpoint, method = 'GET') => {
    calls.push(method);
    if (endpoint === `repos/${CONTROL}`) return repo;
    return {content: Buffer.from(JSON.stringify(MARKER)).toString('base64')};
  }, {});
  assert.equal(existing.initialized, false);
  assert.ok(calls.every(method => method === 'GET'));
});

test('novo controle é privado, publica somente templates e usa atualização sem força', async () => {
  const calls = [];
  const files = Object.fromEntries(TEMPLATE_FILES.map(path => [path, 'fixture']));
  const result = await prepareControl(async (endpoint, method = 'GET', body) => {
    calls.push({endpoint, method, body});
    if (endpoint === `repos/${CONTROL}`) return null;
    if (endpoint === 'user/repos') { assert.equal(body.private, true); return repo; }
    if (endpoint.endsWith('/contents/atlas-control.json')) return null;
    if (endpoint.endsWith('/git/ref/heads/main')) return {object: {sha}};
    if (endpoint.endsWith(`/git/commits/${sha}`)) return {tree: {sha: 'old-tree'}};
    if (endpoint.includes('/git/trees/old-tree')) return {tree: [{path: 'README.md'}]};
    if (endpoint.endsWith('/git/trees')) { assert.deepEqual(body.tree.map(e => e.path), TEMPLATE_FILES); return {sha: 'new-tree'}; }
    if (endpoint.endsWith('/git/commits')) return {sha: 'new-commit'};
    if (endpoint.endsWith('/git/refs/heads/main')) { assert.equal(body.force, false); return {}; }
    throw Error('Endpoint não esperado: ' + endpoint);
  }, files);
  assert.deepEqual(result, {created: true, initialized: true});
  assert.equal(calls.filter(call => call.endpoint === 'user/repos').length, 1);
});

test('primeiro bloco 6 é solicitado uma vez e reinstalação não duplica pedido', async () => {
  const once = await requestFirstTest(async (endpoint, method, body) => {
    if (method === 'PUT') {
      const request = validateRequest(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')));
      assert.equal(request.bloco, '6'); assert.equal(request.sourceSha, sha);
      return {commit: {sha: 'pedido-commit'}};
    }
    return endpoint.endsWith('/branches/main') ? {commit: {sha}} : null;
  }, new Date(pedido.createdAt));
  assert.equal(once.created, true);
  let calls = 0;
  assert.deepEqual(await requestFirstTest(async () => { calls++; return {content: 'existente'}; }), {created: false});
  assert.equal(calls, 1);
});

test('binários só são usados com checksum correto e download interrompido não é promovido', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-installer-test-'));
  const file = join(directory, 'runner.tar.gz');
  const content = 'verified fixture';
  const digest = createHash('sha256').update(content).digest('hex');
  const url = 'https://github.com/actions/runner/releases/download/vtest/runner.tar.gz';
  try {
    await assert.rejects(downloadVerified(url, file, digest, async () => new Response('bad bytes')));
    await assert.rejects(access(file));
    await assert.rejects(access(file + '.partial'));
    await downloadVerified(url, file, digest, async () => new Response(content));
    assert.equal(await readFile(file, 'utf8'), content);
    await downloadVerified(url, file, digest, async () => { throw Error('Não deve baixar novamente'); });
    await assert.rejects(downloadVerified('https://example.com/runner', file, digest));
  } finally { await rm(directory, {recursive: true, force: true}); }
});
