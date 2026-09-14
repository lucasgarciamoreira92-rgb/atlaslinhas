import {test,expect} from './support/fixtures';
import {setup,admin} from './support/ui';

test('assistente: Cofre protegido, aprovação, edição e limpeza ao sair',async({page})=>{
 await setup(page);
 const assistantRequests:string[]=[];
 page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.startsWith('/api/assistant'))assistantRequests.push(r.postData()||'')});
 await page.getByRole('button',{name:'+ Assistente',exact:true}).click();
 await page.getByRole('button',{name:'Verificações',exact:true}).click();
 const accounts=page.getByLabel('Preparar verificações',{exact:true});
 await accounts.getByRole('button',{name:'Consultar contas e vínculos',exact:true}).click();
 await accounts.getByRole('button',{name:'Nova conta de verificação',exact:true}).click();
 await accounts.getByLabel('Serviço',{exact:true}).fill('Serviço fictício');
 await accounts.getByLabel('Nome da conta',{exact:true}).fill('Conta Cofre teste');
 await accounts.getByLabel('Login',{exact:true}).fill('cofre@example.invalid');
 await accounts.getByRole('button',{name:'Preparar resumo das verificações',exact:true}).click();
 await accounts.getByRole('button',{name:'Aprovar e salvar verificação',exact:true}).click();
 await expect(accounts.getByRole('log')).toContainText('Conta salva após sua aprovação');
 const account=(await (await page.request.get('/api/access')).json()).accounts[0];
 const pane=page.getByLabel('Cofre protegido do assistente',{exact:true});
 const openVault=async()=>{await page.getByRole('button',{name:'Cofre protegido',exact:true}).click();await pane.getByLabel('Conta do Cofre',{exact:true}).selectOption(account.id)};
 const unlock=async()=>{await pane.getByRole('button',{name:/^(Cadastrar|Alterar) credencial$/}).click();await pane.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(admin.password);await pane.getByRole('button',{name:'Desbloquear',exact:true}).click();await expect(pane.getByLabel('Senha da conta',{exact:true})).toBeVisible()};
 await openVault();await unlock();
 const secret='SENHA-FICTICIA-ETAPA-7',codes='CODIGOS-FICTICIOS-ETAPA-7';
 await pane.getByLabel('Senha da conta',{exact:true}).fill(secret);
 await pane.getByLabel('Códigos de recuperação',{exact:true}).fill(codes);
 expect((await (await page.request.get('/api/access')).json()).accounts[0].hasSecret).toBe(false);
 for(const width of [1280,768,390]){
  await page.setViewportSize({width,height:850});
  const save=pane.getByRole('button',{name:'Salvar credencial',exact:true});await save.scrollIntoViewIfNeeded();await expect(save).toBeInViewport();
  expect(await page.locator('#assistant-panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
 await pane.getByRole('button',{name:'Salvar credencial',exact:true}).click();
 await expect(pane.getByRole('button',{name:'Alterar credencial',exact:true})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Revelar',exact:true})).toHaveCount(0);
 await unlock();await pane.getByLabel('Senha da conta',{exact:true}).fill(secret+'-editada');
 await pane.getByRole('button',{name:'Salvar credencial',exact:true}).click();
 await expect(pane.getByRole('button',{name:'Alterar credencial',exact:true})).toBeVisible();
 const vault=async(body:object)=>{const r=await page.request.post('/api/vault',{headers:{Origin:new URL(page.url()).origin},data:{id:account.id,scope:'vault',...body}});expect(r.ok()).toBe(true);return r.json()};
 const {token}=await vault({action:'unlock',password:admin.password,purpose:'read'});
 expect((await vault({action:'read',token,field:'password',intent:'reveal'})).value).toBe(secret+'-editada');
 expect((await vault({action:'read',token,field:'recoveryCodes',intent:'reveal'})).value).toBe(codes);
 await unlock();await pane.getByLabel('Senha da conta',{exact:true}).fill('DESCARTAR');
 await page.getByRole('button',{name:'Fechar assistente',exact:true}).click();await expect(pane).toHaveCount(0);
 await page.getByRole('button',{name:'+ Assistente',exact:true}).click();await pane.getByLabel('Conta do Cofre',{exact:true}).selectOption(account.id);
 await expect(pane.getByLabel('Senha da conta',{exact:true})).toHaveCount(0);
 await unlock();await expect(pane.getByLabel('Senha da conta',{exact:true})).toHaveValue('');
 await pane.getByLabel('Senha da conta',{exact:true}).fill('DESCARTAR');
 await page.getByRole('button',{name:'Preparar cadastro',exact:true}).click();await expect(pane).toHaveCount(0);
 await openVault();await unlock();await expect(pane.getByLabel('Senha da conta',{exact:true})).toHaveValue('');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(pane.getByLabel('Senha da conta',{exact:true})).toHaveCount(0);
 for(const path of ['/api/access','/api/access?history='+account.id,'/api/assistant/accounts']){
  const text=await (await page.request.get(path)).text();expect(text).not.toContain(secret);expect(text).not.toContain(codes);
 }
 expect(assistantRequests.join('\n')).not.toContain(secret);expect(assistantRequests.join('\n')).not.toContain(codes);
 expect((await page.locator('[role=log]').allTextContents()).join(' ')).not.toContain(secret);
});
