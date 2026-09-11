import {test as base, expect, type Page} from '@playwright/test';
import {isolatedServer} from './server';

export const test = base.extend<{app: Awaited<ReturnType<typeof isolatedServer>>; operatorPage: Page}>({
  app: async ({}, use, info) => {
    const app = await isolatedServer();
    try { await use(app); }
    finally {
      if (info.status !== info.expectedStatus) await info.attach('servidor-de-teste', {body: app.logs(), contentType: 'text/plain'});
      await app.close();
    }
  },
  baseURL: async ({app}, use) => { await use(app.url); },
  operatorPage: async ({browser, baseURL}, use, info) => {
    const context = await browser.newContext({baseURL, locale: 'pt-BR', viewport: {width: 1440, height: 1000}});
    await context.tracing.start({screenshots: true, snapshots: true});
    const page = await context.newPage();
    try { await use(page); }
    finally {
      if (info.status !== info.expectedStatus) {
        const path = info.outputPath('operador-trace.zip');
        await context.tracing.stop({path});
        await info.attach('trajetória-operador', {path, contentType: 'application/zip'});
        await info.attach('tela-operador', {body: await page.screenshot({fullPage: true}), contentType: 'image/png'});
      }
      await context.close();
    }
  },
});
export {expect};
