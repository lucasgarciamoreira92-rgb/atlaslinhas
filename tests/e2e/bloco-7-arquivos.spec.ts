import {test, expect} from './support/fixtures';
import {setup, newLine, saveLine, settings, downloadText, dashboard, card, openLine} from './support/ui';

async function analyze(page: import('@playwright/test').Page, text: string) {
  await page.getByLabel('Arquivo de backup (.json)', {exact: true}).setInputFiles({name: 'backup-de-teste.json', mimeType: 'application/json', buffer: Buffer.from(text)});
  await expect(page.getByRole('button', {name: 'Analisar backup', exact: true})).toBeEnabled();
  await page.getByRole('button', {name: 'Analisar backup', exact: true}).click();
}
async function restore(page: import('@playwright/test').Page) {
  await page.getByRole('button', {name: 'Restaurar este backup', exact: true}).click();
  await page.getByRole('alertdialog').getByRole('button', {name: 'Confirmar recuperação', exact: true}).click();
  await expect(page.getByText(/Recuperação concluída: 1 linhas/)).toBeVisible();
}

test('bloco 7: CSV, backup, prévia sem alteração, restauração e desfazer pela interface', async ({page, app}) => {
  await setup(page); await newLine(page, 'Reserva de teste');
  await page.getByLabel('Pacote de dados ativo em GB', {exact: true}).fill('25');
  await page.getByLabel('Mensalidade', {exact: true}).fill('45');
  await saveLine(page); await settings(page);
  const csv = await downloadText(page, page.getByRole('button', {name: 'Exportar linhas CSV', exact: true}));
  expect(csv).toContain('Reserva de teste'); expect(csv).toContain('25 GB'); expect(csv).toContain('Pacote de dados ativo');
  const backup = await downloadText(page, page.getByRole('button', {name: 'Criar e baixar backup', exact: true}));
  const parsed = JSON.parse(backup); expect(parsed.payload.lines).toHaveLength(1); expect(parsed.payload).not.toHaveProperty('members');
  await dashboard(page); await openLine(page, 'Reserva de teste');
  await page.getByLabel('Identificação da linha', {exact: true}).fill('Depois do backup'); await saveLine(page);
  await settings(page); await analyze(page, backup);
  await expect(page.getByRole('button', {name: 'Restaurar este backup', exact: true})).toBeVisible();
  await dashboard(page); await expect(card(page, 'Depois do backup')).toBeVisible();
  await settings(page); await analyze(page, backup); await restore(page);
  const safety = await downloadText(page, page.locator('.saved-backups li').filter({hasText: 'Antes de uma recuperação'}).first().getByRole('button', {name: 'Baixar', exact: true}));
  await dashboard(page); await expect(card(page, 'Reserva de teste')).toBeVisible();
  await page.getByRole('button', {name: 'Histórico de Reserva de teste', exact: true}).click();
  await expect(page.locator('.audit-timeline article').first()).toContainText('Backup restaurado');
  await expect(page.locator('.audit-timeline')).toContainText('Depois do backup');
  await page.keyboard.press('Escape'); await settings(page);
  await analyze(page, safety); await restore(page);
  await dashboard(page); await expect(card(page, 'Depois do backup')).toBeVisible();
  await app.restart(); await page.reload(); await expect(card(page, 'Depois do backup')).toBeVisible();
  await settings(page); await analyze(page, backup);
  await expect(page.getByRole('button', {name: 'Restaurar este backup', exact: true})).toBeVisible();
});

test('bloco 7: arquivo alterado é recusado e mantém o inventário', async ({page}) => {
  await setup(page); await newLine(page, 'Linha preservada'); await saveLine(page); await settings(page);
  const backup = JSON.parse(await downloadText(page, page.getByRole('button', {name: 'Criar e baixar backup', exact: true})));
  backup.payload.lines[0].name = 'Mudança fora da aplicação';
  await analyze(page, JSON.stringify(backup));
  await expect(page.locator('.backup-error')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Restaurar este backup', exact: true})).toHaveCount(0);
  await dashboard(page); await expect(card(page, 'Linha preservada')).toBeVisible();
});
