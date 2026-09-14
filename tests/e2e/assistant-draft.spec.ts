import {test,expect} from './support/fixtures';
import {setup} from './support/ui';

test('rascunho guiado: perguntas, correção, reabertura e nenhuma gravação',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'+ Assistente',exact:true}).click();
 await page.getByRole('button',{name:'Nova linha / chip',exact:true}).click();
 const answer=page.getByLabel('Resposta',{exact:true});
 const send=page.getByRole('button',{name:'Enviar resposta',exact:true});
 for(const [value,select] of [['51999998888',false],['Linha de teste',false],['Vivo',true],['phone',true],['reserve',true],['none',true]] as const){
  await expect(send).toBeDisabled();
  if(select)await answer.selectOption(value);else await answer.fill(value);
  await send.click();await expect(page.getByText('Preparando…',{exact:true})).toHaveCount(0);
 }
 const summary=page.getByLabel('Resumo para revisão',{exact:true});
 await expect(summary).toContainText('Linha de teste');await expect(summary).toContainText('51999998888');
 await page.getByRole('button',{name:'Fechar assistente',exact:true}).click();
 await page.getByRole('button',{name:'+ Assistente',exact:true}).click();
 await expect(summary).toContainText('Linha de teste');
 await page.getByLabel('Campo a informar',{exact:true}).selectOption('name');await answer.fill('Linha corrigida');await send.click();
 await expect(summary).toContainText('Linha corrigida');await expect(summary).not.toContainText('Linha de teste');
 await expect(page.getByRole('button',{name:'Aprovar e salvar · em breve',exact:true})).toBeDisabled();
 const lines=await page.request.get('/api/lines');expect((await lines.json()).lines).toHaveLength(0);
 await page.getByRole('button',{name:'Novo rascunho',exact:true}).click();
 await page.getByRole('button',{name:'Continuar editando',exact:true}).click();await expect(summary).toBeVisible();
 await page.setViewportSize({width:390,height:800});
 await answer.scrollIntoViewIfNeeded();await expect(answer).toBeInViewport();
 const panel=page.getByRole('region',{name:'Assistente Atlas',exact:true});
 expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});

test('rascunho guiado: aparelho novo e seleção explícita para editar',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'+ Assistente',exact:true}).click();
 await page.getByRole('button',{name:'Novo aparelho',exact:true}).click();
 const answer=page.getByLabel('Resposta',{exact:true}),send=page.getByRole('button',{name:'Enviar resposta',exact:true});
 await answer.fill('Celular de teste');await send.click();await expect(send).toBeDisabled();
 await answer.selectOption('android');await send.click();await expect(send).toBeDisabled();
 await answer.fill('Samsung de teste');await send.click();
 await expect(page.getByLabel('Resumo para revisão',{exact:true})).toContainText('Samsung de teste');
 const settings=await page.request.get('/api/settings');expect((await settings.json()).config.devices).toHaveLength(0);
 await page.getByRole('button',{name:'Novo rascunho',exact:true}).click();await page.getByRole('button',{name:'Descartar rascunho',exact:true}).click();
 await page.getByRole('button',{name:'Editar aparelho',exact:true}).click();await expect(page.getByText('0 resultado(s). Selecione o cadastro correto.',{exact:true})).toBeVisible();
});
