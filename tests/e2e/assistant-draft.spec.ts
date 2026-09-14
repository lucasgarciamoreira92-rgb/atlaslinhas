import {test,expect} from './support/fixtures';
import {setup} from './support/ui';

test('rascunho guiado: perguntas, correção, reabertura e nenhuma gravação',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
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
 await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
 await expect(summary).toContainText('Linha de teste');
 await page.getByLabel('Campo a informar',{exact:true}).selectOption('name');await answer.fill('Linha corrigida');await send.click();
 await expect(summary).toContainText('Linha corrigida');await expect(summary).not.toContainText('Linha de teste');
 await expect(page.getByRole('button',{name:'Aprovar e salvar',exact:true})).toBeEnabled();
 const lines=await page.request.get('/api/lines');expect((await lines.json()).lines).toHaveLength(0);
 await page.getByRole('button',{name:'Novo rascunho',exact:true}).click();
 await page.getByRole('button',{name:'Continuar editando',exact:true}).click();await expect(summary).toBeVisible();
 await page.setViewportSize({width:390,height:800});
 await answer.scrollIntoViewIfNeeded();await expect(answer).toBeInViewport();
 const panel=page.getByRole('region',{name:'Assistente Atlas',exact:true});
 expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.getByRole('button',{name:'Aprovar e salvar',exact:true}).click();
 await expect(page.getByRole('log',{name:'Conversa do rascunho'})).toContainText('Cadastro salvo após sua aprovação');
 const saved=await page.request.get('/api/lines');expect((await saved.json()).lines[0].name).toBe('Linha corrigida');
 await page.getByRole('button',{name:'Editar linha / chip',exact:true}).click();
 await page.getByRole('button',{name:'Linha corrigida · 51999998888',exact:true}).click();
 await page.getByLabel('Campo a informar',{exact:true}).selectOption('owner');await answer.fill('Responsável teste');await send.click();
 await expect(summary).toContainText('Responsável teste');await page.getByRole('button',{name:'Aprovar e salvar',exact:true}).click();
 await expect(page.getByRole('log',{name:'Conversa do rascunho'})).toContainText('Cadastro salvo após sua aprovação');
 expect((await (await page.request.get('/api/lines')).json()).lines[0].owner).toBe('Responsável teste');
});

test('rascunho guiado: aparelho novo e seleção explícita para editar',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true}).click();
 await page.getByRole('button',{name:'Novo aparelho',exact:true}).click();
 const answer=page.getByLabel('Resposta',{exact:true}),send=page.getByRole('button',{name:'Enviar resposta',exact:true});
 await answer.fill('Celular de teste');await send.click();await expect(send).toBeDisabled();
 await answer.selectOption('android');await send.click();await expect(send).toBeDisabled();
 await answer.fill('Samsung de teste');await send.click();
 await expect(page.getByLabel('Resumo para revisão',{exact:true})).toContainText('Samsung de teste');
 const settings=await page.request.get('/api/settings');expect((await settings.json()).config.devices).toHaveLength(0);
 await page.getByRole('button',{name:'Aprovar e salvar',exact:true}).click();
 await expect(page.getByRole('log',{name:'Conversa do rascunho'})).toContainText('Cadastro salvo após sua aprovação');
 expect((await (await page.request.get('/api/settings')).json()).config.devices).toHaveLength(1);
 await page.getByRole('button',{name:'Editar aparelho',exact:true}).click();
 await page.getByRole('button',{name:'Celular de teste · Samsung de teste',exact:true}).click();
 await page.getByLabel('Campo a informar',{exact:true}).selectOption('location');await answer.fill('Sala de teste');await send.click();
 await expect(page.getByLabel('Resumo para revisão',{exact:true})).toContainText('Sala de teste');
 await page.getByRole('button',{name:'Aprovar e salvar',exact:true}).click();
 await expect(page.getByRole('log',{name:'Conversa do rascunho'})).toContainText('Cadastro salvo após sua aprovação');
 expect((await (await page.request.get('/api/settings')).json()).config.devices[0].location).toBe('Sala de teste');
});
