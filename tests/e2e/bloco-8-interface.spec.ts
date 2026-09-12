import {test, expect} from './support/fixtures';
import type {Page, Locator} from '@playwright/test';
import {setup, settings, dashboard, newLine, saveLine, choose, saveDevice, card, openLine} from './support/ui';

async function sample(page: Page) {
  await setup(page); await settings(page);
  await page.getByRole('button', {name: 'Novo aparelho', exact: true}).click();
  await page.getByLabel('iPhone', {exact: true}).check();
  await choose(page, 'Modelo', 'iPhone 15');
  await page.getByLabel('Nome do aparelho', {exact: true}).fill('Celular de validação');
  await page.getByLabel('Local do aparelho', {exact: true}).fill('Sala de testes');
  await page.getByRole('checkbox', {name: 'eSIM 1', exact: true}).check();
  await saveDevice(page); await dashboard(page);
  await newLine(page, 'Linha de validação');
  await choose(page, 'Aparelho vinculado', 'Celular de validação · iPhone 15');
  await choose(page, 'Slot do chip', 'eSIM 1');
  await page.getByLabel('Pacote de dados ativo em GB', {exact: true}).fill('25');
  await page.getByLabel('Mensalidade', {exact: true}).fill('45');
  await page.getByLabel('Dia de vencimento', {exact: true}).fill('27');
  await saveLine(page);
}
async function withinViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
  })).toBe(true);
}

test('bloco 8: menu recolhível, três destinos, formulários e fechamento sem salvar', async ({page}) => {
  await sample(page);
  const nav = page.getByRole('navigation', {name: 'Menu principal'});
  const toggle = nav.getByRole('button', {name: 'Configurações', exact: true});
  if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
  await expect(nav.getByRole('button')).toHaveCount(4);
  await toggle.click();
  await expect(nav.getByRole('button')).toHaveCount(7);
  for (const name of ['Minhas linhas', 'Chips em reserva']) {
    await nav.getByRole('button', {name: new RegExp('^' + name)}).click();
    await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
  }
  await settings(page);
  await page.getByRole('button', {name: 'Novo aparelho', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Cadastrar aparelho', exact: true})).toBeVisible();
  await page.getByRole('dialog').getByRole('button', {name: 'Close', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await dashboard(page); await openLine(page, 'Linha de validação');
  await page.getByLabel('Identificação da linha', {exact: true}).fill('Rascunho descartado');
  await page.keyboard.press('Escape');
  await expect(card(page, 'Linha de validação')).toBeVisible();
  await expect(card(page, 'Rascunho descartado')).toHaveCount(0);
  await openLine(page, 'Linha de validação');
  await expect(page.getByLabel('Identificação da linha', {exact: true})).toHaveValue('Linha de validação');
});

test('bloco 8: hierarquia dos cards, hover 2,5%, cores preservadas e movimento reduzido', async ({page}, info) => {
  await sample(page);
  const target = card(page, 'Linha de validação');
  await expect(target.locator('.line-card-identity > strong')).toHaveText('(51) 91111-0001');
  await expect(target.locator('.line-card-number')).toHaveText('Linha de validação');
  await expect(target.locator('.line-card-location > strong')).toHaveText('iPhone 15 · eSIM 1');
  await expect(target.locator('.line-card-device')).toHaveText('Sala de testes');
  await expect(target.locator('.line-card-data-package strong')).toHaveText('25 GB');
  await expect(target).toContainText('R$ 45,00');
  await expect(target).toContainText('Vence dia 27');
  for (const item of [target, ...await page.locator('.metrics .metric').all()]) {
    await page.mouse.move(0, 0);
    const colors = () => item.evaluate(el => ({color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor}));
    const before = await colors();
    await item.hover();
    await expect(item).toHaveCSS('transform', 'matrix(1.025, 0, 0, 1.025, 0, 0)');
    expect(await colors()).toEqual(before);
    await page.mouse.move(0, 0);
    await expect(item).toHaveCSS('transform', 'none');
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const item of [target, ...await page.locator('.metrics .metric').all()]) {
    await item.hover(); await expect(item).toHaveCSS('transform', 'none');
  }
  await page.mouse.move(0, 0);
  await info.attach('visao-geral-desktop', {body: await page.screenshot({fullPage: true}), contentType: 'image/png'});
});

for (const width of [1280, 768, 390]) {
  test(`bloco 8: navegação, edição e histórico na largura ${width}px`, async ({page}, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await sample(page); await page.setViewportSize({width, height: 844});
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const target = card(page, 'Linha de validação');
    await target.scrollIntoViewIfNeeded();
    for (const selector of ['.line-card-identity > strong', '.line-card-data-package strong', '.line-card-location > strong']) {
      await expect(target.locator(selector)).toBeVisible();
      expect(await target.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    await info.attach(`dashboard-${width}`, {body: await page.screenshot({fullPage: true}), contentType: 'image/png'});
    await openLine(page, 'Linha de validação');
    await expect.poll(() => page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.getByLabel('Observação', {exact: true}).fill('Revisão de interface');
    const save = page.getByRole('button', {name: 'Salvar linha', exact: true});
    await save.scrollIntoViewIfNeeded(); await withinViewport(save); await saveLine(page);
    await page.getByRole('button', {name: 'Histórico de Linha de validação', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Trajetória do número', exact: true})).toBeVisible();
    await expect(page.locator('.audit-timeline article').first()).toContainText('Revisão de interface');
    await info.attach(`historico-${width}`, {body: await page.screenshot(), contentType: 'image/png'});
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    const nav = page.getByRole('navigation', {name: 'Menu principal'});
    if (!await nav.isVisible()) await page.getByRole('button', {name: 'Abrir ou fechar menu', exact: true}).click();
    await expect(nav).toBeVisible();
    const toggle = nav.getByRole('button', {name: 'Configurações', exact: true});
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    await nav.getByRole('button', {name: /^Minhas linhas/}).click();
    await expect(page.getByRole('heading', {name: 'Minhas linhas', exact: true})).toBeVisible();
    if (width < 768) await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
