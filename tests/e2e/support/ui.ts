import {expect, type Page, type Locator} from '@playwright/test';
export const admin = {name: 'Administrador de teste', email: 'admin@example.invalid', password: '01234567'};
export const operator = {name: 'Operador de teste', email: 'operator@example.invalid', password: '00112233'};
export async function setup(page: Page) {
  await page.goto('/');
  await page.getByLabel('Seu nome', {exact: true}).fill(admin.name);
  await page.getByLabel('E-mail', {exact: true}).fill(admin.email);
  await page.getByLabel('Senha', {exact: true}).fill(admin.password);
  await page.getByLabel('Confirmar senha', {exact: true}).fill(admin.password);
  await page.getByRole('button', {name: 'Criar meu acesso', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Controle de linhas.'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Nova linha', exact: true})).toBeEnabled();
}
export async function login(page: Page, account = operator) {
  await page.goto('/');
  await page.getByLabel('E-mail', {exact: true}).fill(account.email);
  await page.getByLabel('Senha', {exact: true}).fill(account.password);
  await page.getByRole('button', {name: 'Entrar', exact: true}).click();
}
export async function settings(page: Page) {
  const nav = page.getByRole('navigation', {name: 'Menu principal'});
  const trigger = nav.getByRole('button', {name: 'Configurações', exact: true});
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  await nav.getByRole('button', {name: 'Cadastro de aparelhos', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Minha senha', exact: true})).toBeVisible();
}
export async function dashboard(page: Page) {
  await page.getByRole('navigation', {name: 'Menu principal'}).getByRole('button', {name: 'Visão geral', exact: true}).click();
}
export async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('combobox', {name: label, exact: true}).click();
  await page.getByRole('option', {name: option, exact: typeof option === 'string'}).click();
}
export async function createOperator(page: Page) {
  await settings(page);
  await page.getByLabel('Nome do operador').fill(operator.name);
  await page.getByLabel('E-mail do operador').fill(operator.email);
  await page.getByLabel('Senha inicial do operador').fill(operator.password);
  await page.getByRole('button', {name: 'Autorizar operador', exact: true}).click();
  await expect(member(page)).toBeVisible();
}
export function member(page: Page) { return page.locator('.team-list li').filter({hasText: operator.email}); }
export function card(page: Page, name: string) { return page.locator('.line-card-wrap').filter({has: page.getByRole('button', {name: new RegExp('^Ver detalhes de ' + name + ',')})}); }
export async function newLine(page: Page, name: string, number = '51911110001') {
  await page.getByRole('button', {name: 'Nova linha', exact: true}).click();
  await page.getByLabel('Número com DDD', {exact: true}).fill(number);
  await page.getByLabel('Identificação da linha', {exact: true}).fill(name);
  await page.getByLabel('Responsável', {exact: true}).fill('Responsável de teste');
  await page.getByLabel('Onde está guardado?', {exact: true}).fill('Gaveta de teste');
}
export async function saveLine(page: Page) {
  await page.getByRole('button', {name: 'Salvar linha', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
export async function openLine(page: Page, name: string) {
  await card(page, name).getByRole('button', {name: /^Ver detalhes/}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
export async function saveDevice(page: Page) {
  await page.getByRole('button', {name: 'Salvar aparelho', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
export async function downloadText(page: Page, button: Locator) {
  const download = page.waitForEvent('download');
  await button.click();
  const file = await download;
  const stream = await file.createReadStream();
  const buffers: Buffer[] = [];
  for await (const chunk of stream) buffers.push(Buffer.from(chunk));
  return Buffer.concat(buffers).toString('utf8');
}
