import {test,expect} from './support/fixtures';
import {setup,admin} from './support/ui';

test('assistente: campos visíveis e separados em desktop e celular',async({page},info)=>{
 await setup(page);
 await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
 const panel=page.getByRole('region',{name:'Configuração do assistente',exact:true});
 await expect(panel.getByRole('heading',{name:'Vamos conectar o Atlinhas?'})).toBeVisible();
 await expect(panel.getByRole('link',{name:'Abrir página de chaves'})).toHaveAttribute('href','https://platform.openai.com/api-keys');
 await panel.getByRole('button',{name:'Já tenho a chave · continuar',exact:true}).click();
 for(const width of [1280,768,390]){
  await page.setViewportSize({width,height:800});
  await expect(panel).toBeVisible();
  const fields=panel.locator('label');
  await expect(fields).toHaveCount(3);
  for(const field of await fields.all()){
   const input=field.locator('input');
   await input.scrollIntoViewIfNeeded();
   await expect(input).toHaveCSS('border-top-style','solid');
   await expect(input).toHaveCSS('border-top-width','1px');
   await expect(input).toHaveCSS('background-color','rgb(255, 255, 255)');
   const labelBox=await field.locator('span').boundingBox();
   const inputBox=await input.boundingBox();
   expect(labelBox).not.toBeNull();expect(inputBox).not.toBeNull();
   expect(inputBox!.y).toBeGreaterThanOrEqual(labelBox!.y+labelBox!.height+7);
   expect(inputBox!.height).toBeGreaterThanOrEqual(44);
   expect(inputBox!.x).toBeGreaterThanOrEqual(0);
   expect(inputBox!.x+inputBox!.width).toBeLessThanOrEqual(width);
  }
  await expect(panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).resolves.toBe(true);
  const save=page.getByRole('button',{name:'Salvar configuração',exact:true});
  await save.scrollIntoViewIfNeeded();await expect(save).toBeInViewport();
  await panel.evaluate(el=>{el.scrollTop=0;});
  await info.attach('configuracao-'+width,{body:await panel.screenshot(),contentType:'image/png'});
 }
});

test('assistente: configuração privada, senha e persistência',async({page,app})=>{
 await setup(page);
 await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
 await page.getByRole('button',{name:'Já tenho a chave · continuar',exact:true}).click();
 await expect(page.getByLabel('Identificador do modelo',{exact:true})).toHaveValue('gpt-5.4-mini');
 await page.getByLabel('Chave da API',{exact:true}).fill('sk-ficticia-nao-e-uma-chave-real');
 await page.getByLabel('Identificador do modelo',{exact:true}).fill('modelo-ficticio');
 await page.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill('incorreta');
 await page.getByRole('button',{name:'Salvar configuração',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('incorreta');
 await expect(page.getByLabel('Chave da API',{exact:true})).toHaveValue('');
 await page.getByLabel('Chave da API',{exact:true}).fill('sk-ficticia-nao-e-uma-chave-real');
 await page.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(admin.password);
 await page.getByRole('button',{name:'Salvar configuração',exact:true}).click();
 await expect(page.getByRole('region',{name:'Configuração do assistente',exact:true}).getByRole('status')).toContainText('Configuração salva · teste pendente');
 await page.getByRole('button',{name:'Ir para conversa sem testar',exact:true}).click();
 await expect(page.getByLabel('Mensagem',{exact:true})).toBeEnabled();
 await expect(page.locator('.atlas-assistant')).not.toContainText('sk-ficticia');
 await page.reload();
 await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
 await expect(page.getByLabel('Mensagem',{exact:true})).toBeEnabled();
 // A chave é fictícia: não enviar mensagens nem fazer chamadas externas.
});

test.describe('tutorial e teste de conexão com provedor isolado',()=>{
 test.use({assistantStub:true});
 test('assistente: tutorial reabrível, teste explícito, manutenção e limpeza dos campos',async({page},info)=>{
  await setup(page);
  let tests=0;page.on('request',r=>{if(r.url().endsWith('/api/assistant/test'))tests++});
  await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
  await page.getByRole('button',{name:'Abrir configurações',exact:true}).click();await page.getByRole('button',{name:/Conexão com a OpenAI/}).click();
  const panel=page.getByRole('region',{name:'Configuração do assistente',exact:true});
  await expect(panel.getByRole('status')).toContainText('teste pendente');
  await panel.getByRole('button',{name:'Ver tutorial',exact:true}).click();
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:850});
   await expect(panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).resolves.toBe(true);
   await panel.evaluate(el=>{el.scrollTop=0});
   await info.attach('tutorial-'+width,{body:await panel.screenshot(),contentType:'image/png'});
  }
  await panel.getByRole('button',{name:'Já tenho a chave · continuar',exact:true}).click();
  await expect(panel.getByLabel('Identificador do modelo',{exact:true})).toHaveValue('modelo-ficticio');
  await panel.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(admin.password);
  await panel.getByRole('button',{name:'Salvar configuração',exact:true}).click();
  await expect(panel.getByRole('status')).toContainText('teste pendente');
  expect(tests).toBe(0);
  await panel.getByRole('button',{name:'Testar conexão',exact:true}).click();
  await expect(panel.getByRole('status')).toContainText('Conexão testada com sucesso');
  expect(tests).toBe(1);
  await info.attach('conexao-testada',{body:await panel.screenshot(),contentType:'image/png'});
  await panel.getByRole('button',{name:'Começar a conversar',exact:true}).click();
  await expect(page.getByLabel('Mensagem',{exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Abrir configurações',exact:true}).click();await page.getByRole('button',{name:/Conexão com a OpenAI/}).click();
  await panel.getByRole('button',{name:'Alterar configuração',exact:true}).click();
  await panel.getByLabel('Chave da API',{exact:true}).fill('sk-ficticia-descartar-sem-salvar');
  await panel.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(admin.password);
  await panel.getByRole('button',{name:'Fechar assistente',exact:true}).click();
  await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
  await panel.getByRole('button',{name:'Alterar configuração',exact:true}).click();
  await expect(panel.getByLabel('Chave da API',{exact:true})).toHaveValue('');
  await expect(panel.getByLabel('Sua senha de acesso ao Atlas',{exact:true})).toHaveValue('');
 });

 test('assistente: falha no teste orienta sem mostrar sucesso, segredo ou alterar cadastros',async({page})=>{
  await setup(page);
  const before=await (await page.request.get('/api/lines')).json();
  await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
  await page.getByRole('button',{name:'Abrir configurações',exact:true}).click();await page.getByRole('button',{name:/Conexão com a OpenAI/}).click();
  const panel=page.getByRole('region',{name:'Configuração do assistente',exact:true});
  for(const [model,message] of [['teste-chave-invalida','chave da OpenAI foi recusada'],['teste-modelo-ausente','Modelo não encontrado'],['teste-sem-saldo','saldo ou cota insuficiente']]){
   await panel.getByRole('button',{name:'Alterar configuração',exact:true}).click();
   await panel.getByLabel('Identificador do modelo',{exact:true}).fill(model);
   await panel.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(admin.password);
   await panel.getByRole('button',{name:'Salvar configuração',exact:true}).click();
   await panel.getByRole('button',{name:'Testar conexão',exact:true}).click();
   await expect(panel.getByRole('alert')).toContainText(message);
   await expect(panel.getByRole('status')).not.toContainText('sucesso');
   await expect(panel).not.toContainText('SEGREDO_DO_PROVEDOR');
  }
  expect(await (await page.request.get('/api/lines')).json()).toEqual(before);
 });
});
