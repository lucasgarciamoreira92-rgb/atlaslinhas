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
    // Playwright Test owns tracing for contexts created through its browser fixture.
    const page = await context.newPage();
    try { await use(page); }
    finally {
      if (info.status !== info.expectedStatus) {
        await info.attach('tela-operador', {body: await page.screenshot({fullPage: true}), contentType: 'image/png'});
      }
      await context.close();
    }
  },
});
export {expect};
