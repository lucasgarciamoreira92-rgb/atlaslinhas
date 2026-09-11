import {readFileSync, writeFileSync, mkdirSync, appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {platform, release} from 'node:os';
import {pathToFileURL} from 'node:url';

export function summarize(report, outcome, context) {
  const scenarios = [];
  function visit(suites = []) {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) scenarios.push({
        nome: spec.title, resultado: test.status, duracaoMs: test.results?.at(-1)?.duration ?? 0,
      });
      visit(suite.suites);
    }
  }
  if (report) visit(report.suites);
  const counts = {aprovados: 0, falhas: 0, instaveis: 0, ignorados: 0};
  for (const test of scenarios) {
    if (test.resultado === 'expected') counts.aprovados++;
    else if (test.resultado === 'flaky') counts.instaveis++;
    else if (test.resultado === 'skipped') counts.ignorados++;
    else counts.falhas++;
  }
  const hasErrors = (report?.errors?.length ?? 0) > 0;
  const ok = outcome === 'success' && scenarios.length > 0 && counts.aprovados === scenarios.length && !hasErrors;
  return {...context, resultado: ok ? 'aprovado' : scenarios.length ? 'reprovado ou incompleto' : 'não executado',
    etapaTestes: outcome, ...counts, cenarios: scenarios, errosGlobais: report?.errors?.length ?? 0,
    dados: 'Fictícios e temporários; inventário real não utilizado',
    observacao: 'Resultado técnico da execução. Aceite visual e operacional final permanece separado.'};
}
const escapeMd = value => String(value ?? '').replace(/[|\r\n]/g, ' ').replace(/[<>]/g, '');
export function markdown(result) {
  return `# Atlas Linhas — validação no Mac\n\n` +
    `**Resultado: ${result.resultado}.**\n\n` +
    `Pedido: ${escapeMd(result.pedido)} · Bloco: ${escapeMd(result.bloco)}\n\n` +
    `Código: \`${escapeMd(result.sourceSha)}\`\n\n` +
    `Ambiente: ${escapeMd(result.sistema)} · Node ${escapeMd(result.node)}\n\n` +
    `Aprovados: ${result.aprovados} · Falhas: ${result.falhas} · Instáveis: ${result.instaveis} · Ignorados: ${result.ignorados}\n\n` +
    (result.cenarios.length ? '| Cenário | Resultado |\n|---|---|\n' + result.cenarios.map(t => `| ${escapeMd(t.nome)} | ${escapeMd(t.resultado)} |`).join('\n') + '\n\n' :
      'Os testes não chegaram a produzir resultados. Consulte a etapa de preparação ou execução que falhou.\n\n') +
    `${result.dados}.\n\n${result.observacao}\n`;
}
function main() {
  const workspace = process.env.GITHUB_WORKSPACE;
  let report = null;
  // Ignore any previous report if the current test step never ran.
  if (['success', 'failure'].includes(process.env.ATLAS_TEST_OUTCOME)) {
    try { report = JSON.parse(readFileSync(join(workspace, 'application/test-results/results.json'), 'utf8')); } catch {}
  }
  const result = summarize(report, process.env.ATLAS_TEST_OUTCOME || 'skipped', {
    pedido: process.env.ATLAS_REQUEST_ID, bloco: process.env.ATLAS_TEST_BLOCK, sourceSha: process.env.ATLAS_SOURCE_SHA,
    sistema: `${platform()} ${release()}`, node: process.version, quando: new Date().toISOString(),
    execucao: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  });
  const output = join(workspace, 'control/out');
  mkdirSync(output, {recursive: true});
  const summary = markdown(result);
  writeFileSync(join(output, 'resultado.json'), JSON.stringify(result, null, 2) + '\n');
  writeFileSync(join(output, 'resumo.md'), summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  if (result.resultado !== 'aprovado') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
