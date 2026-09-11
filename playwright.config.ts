import {execFileSync} from 'node:child_process';
import {platform, release} from 'node:os';
import {defineConfig, devices} from '@playwright/test';
function commit() { try { return execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(); } catch { return 'Não disponível'; } }
export default defineConfig({
  metadata: {commit: commit(), sistema: platform() + ' ' + release(), node: process.version, dados: 'Fictícios e temporários'},
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
