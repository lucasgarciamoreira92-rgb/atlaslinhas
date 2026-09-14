import {test,expect} from './support/fixtures';
import {setup} from './support/ui';
import type {Page} from '@playwright/test';

async function expectTailOutsideFace(page:Page){
 const tail=page.locator('.atlas-assistant .speech-tail');
 await expect(tail).toHaveAttribute('d',/^M /);
 // Compara a curva desenhada com a silhueta real da cabeça, já transformada.
 await expect.poll(async()=>page.locator('.atlas-assistant').evaluate(root=>{
  const curve=root.querySelector<SVGPathElement>('.speech-tail')!;
  const silhouette=root.querySelector<SVGPathElement>('#atl-front-head path')!;
  const head=root.querySelector<SVGGElement>('.head-front')!;
  const curveMatrix=curve.getScreenCTM(),headMatrix=head.getScreenCTM();
  if(!curveMatrix||!headMatrix)return -1;
  const inverse=headMatrix.inverse(),length=curve.getTotalLength();let overlaps=0;
  for(let i=0;i<=60;i++){
   const local=curve.getPointAtLength(length*i/60),screen=local.matrixTransform(curveMatrix);
   if(silhouette.isPointInFill(screen.matrixTransform(inverse)))overlaps++;
  }
  return overlaps;
 })).toBe(0);
}

test('Atlinhas: poses alternadas, aceno e balões sem cobrir o rosto',async({page},info)=>{
 await setup(page);
 const root=page.locator('.atlas-assistant'),launch=page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true});
 await expect(launch).toBeVisible();
 await expect(page.getByRole('button',{name:'+ Assistente',exact:true})).toHaveCount(0);
 for(const asset of ['atlinhas-classic.jpg','atlinhas-front.webp'])expect((await page.request.get('/mascots/'+asset)).ok()).toBe(true);
 await page.mouse.move(0,0);
 await expect(root.locator('.classic-body')).toHaveCSS('opacity','1');
 await expect(root.locator('.frontal-body')).toHaveCSS('opacity','1',{timeout:12000});
 await expect(root).toHaveClass(/waving/);
 await expect(root.locator('.classic-body')).toHaveCSS('opacity','1',{timeout:10000});
 await launch.hover();
 await expect(root.locator('.head-front')).toHaveCSS('opacity','1');
 await expect(root.locator('.mascot-hello')).toBeVisible();
 await expect(root).toHaveClass(/waving/);
 await expectTailOutsideFace(page);
 await info.attach('atlinhas-cumprimento',{body:await page.screenshot(),contentType:'image/png'});
 await launch.click();
 const panel=page.getByRole('region',{name:'Assistente Atlas',exact:true});
 await expect(panel).toBeVisible();await expect(root.locator('.mascot-hello')).toBeHidden();
 await expectTailOutsideFace(page);
 await expect(page.getByRole('button',{name:'Nova linha / chip',exact:true})).toBeVisible();
 await info.attach('atlinhas-conversa',{body:await page.screenshot(),contentType:'image/png'});
 await page.getByRole('button',{name:'Fechar assistente',exact:true}).click();
 await expect(panel).toBeHidden();await expect(launch).toBeFocused();
});

test('Atlinhas: navegação por teclado, tamanhos de tela e movimento reduzido',async({page},info)=>{
 await setup(page);
 const launch=page.getByRole('button',{name:'Abrir assistente Atlinhas',exact:true});
 const panel=page.getByRole('region',{name:'Assistente Atlas',exact:true});
 for(const size of [{width:1280,height:800},{width:768,height:800},{width:390,height:800},{width:850,height:460}]){
  await page.setViewportSize(size);await launch.focus();await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  const box=await panel.boundingBox();expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x+box!.width).toBeLessThanOrEqual(size.width);expect(box!.y+box!.height).toBeLessThanOrEqual(size.height);
  expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await expect(page.getByRole('button',{name:'Fechar assistente',exact:true})).toBeInViewport();
  await info.attach('atlinhas-'+size.width+'x'+size.height,{body:await page.screenshot(),contentType:'image/png'});
  await page.keyboard.press('Escape');await expect(panel).toBeHidden();await expect(launch).toBeFocused();
 }
 await page.emulateMedia({reducedMotion:'reduce'});await launch.hover();
 await expect(page.locator('.atlas-assistant .head-front')).toHaveCSS('opacity','1');
 await expect(page.locator('.atlas-assistant .body-float')).toHaveCSS('animation-name','none');
 await launch.click();await expect(panel).toBeVisible();await expectTailOutsideFace(page);
});
