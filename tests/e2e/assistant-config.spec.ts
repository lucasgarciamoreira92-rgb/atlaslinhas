import {test,expect} from './support/fixtures';
import {setup,admin} from './support/ui';

test('assistente: configuração privada, senha e persistência',async({page,app})=>{
 await setup(page);
 await page.getByRole('button',{name:'+ Assistente',exact:true}).click();
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
 await page.getByRole('button',{name:'+ Assistente',exact:true}).click();
 await expect(page.getByLabel('Mensagem',{exact:true})).toBeEnabled();
 // A chave é fictícia: não enviar mensagens nem fazer chamadas externas.
});
