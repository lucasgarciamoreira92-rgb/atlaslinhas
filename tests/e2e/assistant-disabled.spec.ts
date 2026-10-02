import {test,expect} from './support/fixtures';
import {setup} from './support/ui';

test('Atlinhas oculto: interface e rotas de IA ficam indisponíveis',async({page})=>{
 await setup(page);
 await expect(page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true})).toHaveCount(0);
 await expect(page.locator('.atlas-assistant')).toHaveCount(0);
 const status=await page.request.get('/api/assistant');
 expect(status.status()).toBe(200);
 expect((await status.json()).enabled).toBe(false);
 const conversation=await page.request.post('/api/assistant/conversation',{headers:{Origin:new URL(page.url()).origin},data:{action:'message',message:'teste'}});
 expect(conversation.status()).toBe(404);
 await expect(page.getByText('Verificações e autenticações',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('Cofre',{exact:true}).first()).toBeVisible();
});

test.describe('reativação preservada',()=>{
 test.use({assistantEnabled:true});
 test('Atlinhas volta a aparecer quando a chave local está ativa',async({page})=>{
  await setup(page);
  await expect(page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true})).toBeVisible();
  expect((await (await page.request.get('/api/assistant')).json()).enabled).toBe(true);
 });
});
