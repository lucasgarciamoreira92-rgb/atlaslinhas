import {test,expect} from './support/fixtures';
import {setup,settings,saveDevice,admin,createOperator,login,operator,dashboard,newLine,saveLine,choose,openLine} from './support/ui';
import type {Page} from '@playwright/test';
async function accountSection(page:Page,section='Verificações e autenticações'){
 await expect(page.getByRole('button',{name:'Abrir ou fechar menu',exact:true})).toBeVisible();
 if(!await page.getByRole('navigation',{name:'Menu principal'}).isVisible())await page.getByRole('button',{name:'Abrir ou fechar menu',exact:true}).click();
 await page.getByRole('navigation',{name:'Menu principal'}).getByRole('button',{name:section,exact:true}).click();
}
async function newAccount(page:Page,name='Google · Direção'){
 await page.getByRole('button',{name:'Nova conta',exact:true}).click();
 await page.getByLabel('Serviço',{exact:true}).fill('Google');await page.getByLabel('Nome da conta',{exact:true}).fill(name);
 await page.getByLabel('Login ou e-mail',{exact:true}).fill(name.includes('Direção')?'direcao@example.invalid':'operacao@example.invalid');
}
async function saveAccount(page:Page){await page.getByRole('button',{name:'Salvar conta',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);}
async function devices(page:Page){await settings(page);for(const [type,name] of [['iPhone','iPhone da direção'],['Android','Samsung da operação']]){await page.getByRole('button',{name:'Novo aparelho',exact:true}).click();await page.getByLabel(type,{exact:true}).check();await choose(page,'Modelo',type==='iPhone'?'iPhone 15':'Motorola Moto G54');await page.getByLabel('Nome do aparelho',{exact:true}).fill(name);await page.getByLabel('Local do aparelho',{exact:true}).fill('Sala de teste');await page.getByLabel('Responsável pelo aparelho',{exact:true}).fill(type==='iPhone'?'Lucas':'Ana');await saveDevice(page);}}

test('verificações: cadastro pela interface, dois aparelhos, pendência e conferência',async({page,app},info)=>{
 await setup(page);await devices(page);await accountSection(page);await newAccount(page);
 await page.getByRole('button',{name:'Adicionar método',exact:true}).click();await page.getByRole('combobox',{name:'Tipo de método',exact:true}).selectOption('prompt');
 const firstDevice=await page.getByRole('combobox',{name:'Aparelho cadastrado',exact:true}).locator('option').filter({hasText:'iPhone da direção'}).getAttribute('value');await page.getByRole('combobox',{name:'Aparelho cadastrado',exact:true}).selectOption(firstDevice!);
 await page.getByRole('combobox',{name:'Situação informada',exact:true}).selectOption('available');
 await page.getByRole('button',{name:'Adicionar outro destino',exact:true}).click();const second=page.locator('.access-destination-editor').nth(1);
 const deviceValue=await second.getByRole('combobox',{name:'Aparelho cadastrado',exact:true}).locator('option').filter({hasText:'Samsung da operação'}).getAttribute('value');await second.getByRole('combobox',{name:'Aparelho cadastrado',exact:true}).selectOption(deviceValue!);await second.getByRole('combobox',{name:'Situação informada',exact:true}).selectOption('available');
 await saveAccount(page);await page.locator('.access-list').getByRole('button',{name:/Google · Direção/}).click();
 await expect(page.locator('.access-detail .access-destination')).toHaveCount(2);await expect(page.locator('.access-detail')).toContainText('iPhone da direção');await expect(page.locator('.access-detail')).toContainText('Samsung da operação');
 await page.getByRole('button',{name:'Informar problema',exact:true}).click();await page.getByLabel('O que aconteceu? Não inclua senhas.',{exact:true}).fill('iPhone fora da sala');await page.getByRole('button',{name:'Registrar problema',exact:true}).click();await expect(page.locator('.access-reports')).toContainText('iPhone fora da sala');
 await page.getByRole('button',{name:'Marcar resolvido',exact:true}).click();await expect(page.locator('.access-reports')).toHaveCount(0);
 await page.getByRole('button',{name:'Conferi o cadastro',exact:true}).click();await expect(page.locator('.access-management')).toContainText('Conferido em');
 await app.restart();await page.reload();await accountSection(page);await page.locator('.access-list').getByRole('button',{name:/Google · Direção/}).click();await expect(page.locator('.access-detail .access-destination')).toHaveCount(2);
 await info.attach('verificacoes-multiplos-aparelhos',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('cofre: senha protegida, acesso fora da seção, permissão do operador e ocultação',async({page,operatorPage},info)=>{
 await setup(page);await createOperator(page);await accountSection(page);await newAccount(page,'Google · Operação');
 await page.getByText('Permissões desta conta e credencial',{exact:true}).click();await page.getByLabel('Revelar e copiar credenciais',{exact:true}).check();await saveAccount(page);
 await accountSection(page,'Cofre');await page.locator('.access-list').getByRole('button',{name:/Google · Operação/}).click();await page.getByRole('button',{name:'Cadastrar credencial',exact:true}).click();
 await page.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(admin.password);await page.getByRole('button',{name:'Desbloquear',exact:true}).click();await page.getByLabel('Senha da conta',{exact:true}).fill('Ficticia-Para-Teste-9527!');await page.getByRole('button',{name:'Salvar credencial',exact:true}).click();
 await expect(page.getByRole('button',{name:'Revelar',exact:true})).toBeVisible();await page.getByRole('button',{name:'Revelar',exact:true}).click();await page.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(admin.password);await page.getByRole('button',{name:'Desbloquear',exact:true}).click();await expect(page.locator('.access-secret')).toHaveText('Ficticia-Para-Teste-9527!');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.locator('.access-secret')).not.toContainText('Ficticia-Para-Teste-9527!');
 await info.attach('cofre-credencial-oculta',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await operatorPage.bringToFront();await login(operatorPage);await accountSection(operatorPage);await operatorPage.locator('.access-list').getByRole('button',{name:/Google · Operação/}).click();await operatorPage.getByRole('button',{name:'Ver credencial',exact:true}).click();await operatorPage.getByRole('button',{name:'Revelar',exact:true}).click();await operatorPage.getByLabel('Sua senha de acesso ao Atlas',{exact:true}).fill(operator.password);await operatorPage.getByRole('button',{name:'Desbloquear',exact:true}).click();await expect(operatorPage.locator('.access-secret')).toHaveText('Ficticia-Para-Teste-9527!');await operatorPage.keyboard.press('Escape');
 await page.bringToFront();await accountSection(page);await page.locator('.access-list').getByRole('button',{name:/Google · Operação/}).click();await page.getByRole('button',{name:'Editar cadastro',exact:true}).click();await page.getByText('Permissões desta conta e credencial',{exact:true}).click();await page.getByLabel('Revelar e copiar credenciais',{exact:true}).uncheck();await page.getByLabel('Credencial sensível',{exact:true}).check();await saveAccount(page);
 await operatorPage.reload();await accountSection(operatorPage);await operatorPage.locator('.access-list').getByRole('button',{name:/Google · Operação/}).click();await operatorPage.getByRole('button',{name:'Ver credencial',exact:true}).click();await expect(operatorPage.getByRole('dialog')).toContainText('não acessar esta credencial');await expect(operatorPage.getByRole('button',{name:'Revelar',exact:true})).toHaveCount(0);
});

test('verificações: consulta pela linha e uso em janelas menores',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);await dashboard(page);await newLine(page,'Linha de confirmação');await saveLine(page);await accountSection(page);await newAccount(page);await page.getByRole('button',{name:'Adicionar método',exact:true}).click();const value=await page.getByRole('combobox',{name:'Linha cadastrada',exact:true}).locator('option').filter({hasText:'Linha de confirmação'}).getAttribute('value');await page.getByRole('combobox',{name:'Linha cadastrada',exact:true}).selectOption(value!);await saveAccount(page);
 await dashboard(page);await openLine(page,'Linha de confirmação');await page.getByRole('button',{name:/Contas vinculadas/}).click();const sheet=page.getByRole('dialog').last();await sheet.getByRole('button',{name:/Google · Direção/}).click();await expect(sheet).toContainText('(51) 91111-0001');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 for(const width of [1280,768,390]){await page.setViewportSize({width,height:1000});await accountSection(page);await page.getByLabel('Buscar contas',{exact:true}).fill('Google');const back=page.getByRole('button',{name:'Voltar às contas',exact:true});if(await back.isVisible())await back.click();await page.locator('.access-list').getByRole('button',{name:/Google · Direção/}).click();await expect(page.getByRole('heading',{name:'Onde confirmar',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await info.attach('verificacoes-'+width,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});}
 expect(errors).toEqual([]);
});
