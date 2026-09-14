import {readFileSync, appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const SOURCE = 'lucasgarciamoreira92-rgb/atlaslinhas';
export const CONTROL = 'lucasgarciamoreira92-rgb/atlaslinhas-validacao-mac';
export const LABEL = 'atlas-linhas-mac';
export const BLOCKS = Object.freeze({
  '6': 'bloco-6-acessos.spec.ts', '7': 'bloco-7-arquivos.spec.ts', '8': 'bloco-8-interface.spec.ts',
  regressao: 'regressao.spec.ts', assistente: 'assistant-.*\\.spec\\.ts', todos: '',
});

export function validateRequest(value) {
  const keys = ['id', 'bloco', 'sourceSha', 'createdAt'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) {
    throw Error('Pedido deve conter somente id, bloco, sourceSha e createdAt.');
  }
  if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.id)) throw Error('Identificador inválido.');
  if (typeof value.bloco !== 'string' || !Object.hasOwn(BLOCKS, value.bloco)) throw Error('Bloco não permitido.');
  if (typeof value.sourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(value.sourceSha)) throw Error('Use o SHA completo do código aprovado.');
  if (typeof value.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt) ||
      !Number.isFinite(Date.parse(value.createdAt)) || new Date(value.createdAt).toISOString() !== value.createdAt) throw Error('Data inválida.');
  return {...value};
}

export function assertControlEvent(event, env) {
  if (env.GITHUB_REPOSITORY !== CONTROL || event.repository?.full_name !== CONTROL || event.repository?.private !== true ||
      env.GITHUB_REF !== 'refs/heads/main' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)) {
    throw Error('Somente pedidos da main do repositório privado podem chegar ao Mac.');
  }
}

export async function assertSourceOnMain(sha, fetcher = fetch) {
  // Public read only. No credential belonging to the private repository is sent.
  const response = await fetcher(`https://api.github.com/repos/${SOURCE}/compare/${sha}...main`, {
    headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'Atlas-Linhas-Validacao'}, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`Não foi possível conferir o código na main (HTTP ${response.status}).`);
  const comparison = await response.json();
  if (comparison.base_commit?.sha !== sha || !['ahead', 'identical'].includes(comparison.status)) {
    throw Error('O commit solicitado não pertence à main do Atlas Linhas.');
  }
}

async function main() {
  assertControlEvent(JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')), process.env);
  const pedido = validateRequest(JSON.parse(readFileSync('requests/atual.json', 'utf8')));
  await assertSourceOnMain(pedido.sourceSha);
  for (const [key, value] of Object.entries(pedido)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  console.log(`Pedido ${pedido.id}: bloco ${pedido.bloco}, código ${pedido.sourceSha}.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
