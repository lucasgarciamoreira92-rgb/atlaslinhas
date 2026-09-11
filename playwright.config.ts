import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120000,
  expect: {timeout: 10000},
  reporter: [['list'], ['html', {open: 'never'}], ['json', {outputFile: 'test-results/results.json'}]],
  use: {
    ...devices['Desktop Chrome'], viewport: {width: 1440, height: 1000}, locale: 'pt-BR',
    actionTimeout: 15000, navigationTimeout: 15000,
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure',
  },
  projects: [{name: 'chromium'}],
});
