import {test,expect} from './support/fixtures';
import {setup,admin} from './support/ui';

test('assistente: campos visíveis e separados em desktop e celular',async({page},info)=>{
 await setup(page);
 await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
 const panel=page.getByRole('region',{name:'Configuração do assistente',exact:true});
 await page.getByRole('button',{name:'Configurar OpenAI',exact:true}).click();
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
 await page.getByRole('button',{name:'Configurar OpenAI',exact:true}).click();
 await page.getByLabel('Chave da API',{exact:true}).fill('sk-ficticia-nao-e-uma-chave-real');
 await page.getByLabel('Identificador do modelo',{exact:true}).fill('modelo-ficticio');
 await page.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill('incorreta');
 await page.getByRole('button',{name:'Salvar configuração',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('incorreta');
 await expect(page.getByLabel('Chave da API',{exact:true})).toHaveValue('');
 await page.getByLabel('Chave da API',{exact:true}).fill('sk-ficticia-nao-e-uma-chave-real');
 await page.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(admin.password);
 await page.getByRole('button',{name:'Salvar configuração',exact:true}).click();
 await expect(page.getByLabel('Mensagem',{exact:true})).toBeEnabled();
 await expect(page.locator('.atlas-assistant')).not.toContainText('sk-ficticia');
 await page.reload();
 await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
 await page.getByRole('button',{name:'Conversa OpenAI',exact:true}).click();
 await expect(page.getByLabel('Mensagem',{exact:true})).toBeEnabled();
 // A chave é fictícia: não enviar mensagens nem fazer chamadas externas.
});
