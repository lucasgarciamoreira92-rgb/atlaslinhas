import {test, expect} from './support/fixtures';
import {setup, login, admin, settings, dashboard, newLine, saveLine, choose, saveDevice, card, openLine} from './support/ui';

test('bloco 1: acesso local, menu, inventário vazio e login após reinício', async ({page, app}) => {
  await setup(page);
  await expect(page.getByText('Tudo pronto para organizar suas linhas', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: /Usar com meus dados|Ver demonstração/})).toHaveCount(0);
  await expect(page.getByText(admin.name, {exact: true})).toBeVisible();
  await settings(page);
  const nav = page.getByRole('navigation', {name: 'Menu principal'});
  for (const name of ['Minhas linhas', 'Chips em reserva']) {
    await nav.getByRole('button', {name: new RegExp('^' + name)}).click();
    await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
  }
  await dashboard(page); await page.reload();
  await page.getByRole('button', {name: 'Sair', exact: true}).click();
  await app.restart(); await login(page, admin);
  await expect(page.getByRole('heading', {name: 'Controle de linhas.'})).toBeVisible();
  await expect(page.locator('.line-card-wrap')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Criar meu acesso', exact: true})).toHaveCount(0);
});

test('blocos 2, 4 e 5: Android, API, reserva, histórico completo, slot ocupado e dados inválidos', async ({page, app}) => {
  await setup(page); await settings(page);
  await page.getByRole('button', {name: 'Novo aparelho', exact: true}).click();
  await page.getByLabel('Android', {exact: true}).check();
  await choose(page, 'Modelo', 'Motorola Moto G54');
  await page.getByLabel('Nome do aparelho', {exact: true}).fill('Android de testes');
  await page.getByLabel('Local do aparelho', {exact: true}).fill('Sala técnica');
  await saveDevice(page); await dashboard(page);
  await newLine(page, 'API de testes');
  await choose(page, 'Uso do número', 'API oficial');
  await page.getByLabel('Sistema ou uso virtual', {exact: true}).fill('Atlas API teste');
  await page.getByLabel('Observação', {exact: true}).fill('Envelope azul');
  await page.getByLabel('Mensalidade', {exact: true}).fill('10');
  await saveLine(page);
  await openLine(page, 'API de testes');
  await page.getByLabel('Identificação da linha', {exact: true}).fill('API revisada');
  await page.getByLabel('Responsável', {exact: true}).fill('Equipe nova');
  await page.getByLabel('Observação', {exact: true}).fill('Entregue ao suporte');
  await page.getByLabel('Mensalidade', {exact: true}).fill('25');
  await choose(page, 'Aparelho vinculado', 'Android de testes · Motorola Moto G54');
  await saveLine(page);
  await expect(card(page, 'API revisada')).toContainText('Motorola Moto G54 · Slot 1');
  await expect(card(page, 'API revisada')).toContainText('Sala técnica');
  await expect(card(page, 'API revisada')).toContainText('Atlas API teste');
  await page.getByRole('button', {name: 'Histórico de API revisada', exact: true}).click();
  const event = page.locator('.audit-timeline article').first();
  for (const [field, before, after] of [
    ['Identificação', 'API de testes', 'API revisada'],
    ['Responsável', 'Responsável de teste', 'Equipe nova'],
    ['Observação', 'Envelope azul', 'Entregue ao suporte'],
    ['Mensalidade', '10,00', '25,00'],
    ['Localização do chip', 'Gaveta de teste', 'Sala técnica'],
    ['Aparelho', 'Não informado', 'Android de testes'],
    ['Slot / eSIM', 'Não informado', 'Slot 1'],
  ]) {
    const change = event.locator('.audit-change').filter({has: page.getByText(field, {exact: true})});
    await expect(change.locator('.audit-before')).toContainText(before);
    await expect(change.locator('.audit-after')).toContainText(after);
  }
  await expect(event).toContainText(admin.email);
  await expect(event.locator('time')).toHaveAttribute('datetime', /\d{4}-\d{2}-\d{2}T/);
  await expect(page.locator('.audit-timeline article').last()).toContainText('Linha cadastrada');
  await page.keyboard.press('Escape');
  await newLine(page, 'Reserva de testes', '51911110002');
  await choose(page, 'Aparelho vinculado', 'Android de testes · Motorola Moto G54');
  await expect(page.getByText(/Todos os slots estão ocupados/)).toBeVisible();
  await page.getByRole('button', {name: 'Salvar linha', exact: true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await choose(page, 'Aparelho vinculado', 'Sem aparelho / chip guardado');
  await choose(page, 'Situação', 'Em reserva');
  await page.getByLabel('Onde está guardado?', {exact: true}).fill('Gaveta 3');
  await page.getByLabel('Observação', {exact: true}).fill('Envelope verde');
  await page.getByLabel('Dia de vencimento', {exact: true}).fill('32');
  await page.getByRole('button', {name: 'Salvar linha', exact: true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByLabel('Dia de vencimento', {exact: true}).evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
  await page.getByLabel('Dia de vencimento', {exact: true}).fill('15');
  await saveLine(page); await app.restart(); await page.reload();
  await expect(card(page, 'API revisada')).toContainText('Motorola Moto G54 · Slot 1');
  await expect(card(page, 'Reserva de testes')).toContainText('Gaveta 3');
  await openLine(page, 'Reserva de testes');
  await expect(page.getByLabel('Observação', {exact: true})).toHaveValue('Envelope verde');
});
