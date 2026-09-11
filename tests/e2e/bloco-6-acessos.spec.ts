import {test, expect} from './support/fixtures';
import {setup, createOperator, login, operator, admin, settings, dashboard, member, newLine, saveLine, card, openLine} from './support/ui';

test('bloco 6: operador edita, registra autoria, tem permissões e perde acesso ao ser bloqueado', async ({page, operatorPage}) => {
  await setup(page);
  await newLine(page, 'Linha da equipe'); await saveLine(page);
  await createOperator(page);
  await login(operatorPage);
  await openLine(operatorPage, 'Linha da equipe');
  await operatorPage.getByLabel('Identificação da linha', {exact: true}).fill('Revisada pelo operador');
  await saveLine(operatorPage);
  await operatorPage.getByRole('button', {name: 'Histórico de Revisada pelo operador', exact: true}).click();
  const event = operatorPage.locator('.audit-timeline article').first();
  await expect(event).toContainText(operator.email);
  await expect(event).toContainText('Linha da equipe');
  await expect(event).toContainText('Revisada pelo operador');
  await expect(event.locator('time')).toHaveAttribute('datetime', /\d{4}-\d{2}-\d{2}T/);
  await operatorPage.keyboard.press('Escape');
  await settings(operatorPage);
  await expect(operatorPage.getByRole('heading', {name: 'Equipe e acessos', exact: true})).toHaveCount(0);
  await expect(operatorPage.getByRole('button', {name: 'Criar e baixar backup', exact: true})).toHaveCount(0);
  await expect(operatorPage.getByRole('button', {name: 'Exportar linhas CSV', exact: true})).toBeVisible();
  // Also prove the server rejects direct access, not just that buttons are hidden.
  expect((await operatorPage.request.get('/api/team')).status()).toBe(403);
  expect((await operatorPage.request.get('/api/backups')).status()).toBe(403);
  await member(page).getByRole('button', {name: 'Bloquear', exact: true}).click();
  await expect(member(page)).toContainText('Bloqueado');
  await operatorPage.reload();
  await expect(operatorPage.getByRole('button', {name: 'Entrar', exact: true})).toBeVisible();
  await login(operatorPage);
  await expect(operatorPage.getByRole('alert')).toBeVisible();
  await expect(operatorPage.getByRole('heading', {name: 'Controle de linhas.'})).toHaveCount(0);
  await member(page).getByRole('button', {name: 'Reativar', exact: true}).click();
  await expect(member(page).getByRole('button', {name: 'Bloquear', exact: true})).toBeVisible();
  await login(operatorPage);
  await expect(card(operatorPage, 'Revisada pelo operador')).toBeVisible();
});

test('bloco 6: senha numérica, confirmação, troca pessoal, revogação e redefinição pelo administrador', async ({page, operatorPage, context}) => {
  await setup(page); await createOperator(page); await login(operatorPage); await settings(operatorPage);
  const otherSession = await context.browser()!.newContext({baseURL: new URL(operatorPage.url()).origin});
  try {
    const other = await otherSession.newPage(); await login(other);
    await expect(other.getByRole('heading', {name: 'Controle de linhas.'})).toBeVisible();
    await operatorPage.getByLabel('Senha atual', {exact: true}).fill(operator.password);
    await operatorPage.getByLabel('Nova senha', {exact: true}).fill('11223344');
    await operatorPage.getByLabel('Confirmar nova senha', {exact: true}).fill('00000000');
    await operatorPage.getByRole('button', {name: 'Alterar senha', exact: true}).click();
    await expect(operatorPage.getByText('As senhas não conferem.', {exact: true})).toBeVisible();
    await operatorPage.getByLabel('Confirmar nova senha', {exact: true}).fill('11223344');
    await operatorPage.getByRole('button', {name: 'Alterar senha', exact: true}).click();
    await expect(operatorPage.getByText('Senha alterada. As outras sessões foram encerradas.', {exact: true})).toBeVisible();
    await other.reload(); await expect(other.getByRole('button', {name: 'Entrar', exact: true})).toBeVisible();
    await operatorPage.getByRole('button', {name: 'Sair', exact: true}).click();
    await login(operatorPage); await expect(operatorPage.getByRole('alert')).toBeVisible();
    await login(operatorPage, {...operator, password: '11223344'});
    await expect(operatorPage.getByRole('heading', {name: 'Controle de linhas.'})).toBeVisible();
    await member(page).getByRole('button', {name: 'Redefinir senha', exact: true}).click();
    await page.getByLabel('Nova senha do operador', {exact: true}).fill('22334455');
    await member(page).getByRole('button', {name: 'Salvar senha', exact: true}).click();
    await expect(page.getByLabel('Nova senha do operador', {exact: true})).toHaveCount(0);
    await operatorPage.reload(); await expect(operatorPage.getByRole('button', {name: 'Entrar', exact: true})).toBeVisible();
    await login(operatorPage, {...operator, password: '11223344'}); await expect(operatorPage.getByRole('alert')).toBeVisible();
    await login(operatorPage, {...operator, password: '22334455'});
    await expect(operatorPage.getByRole('heading', {name: 'Controle de linhas.'})).toBeVisible();
    const owner = page.locator('.team-list li').filter({hasText: admin.email});
    await expect(owner).toContainText('Administrador');
    await expect(owner.getByRole('button', {name: 'Bloquear', exact: true})).toHaveCount(0);
  } finally { await otherSession.close(); }
});
