import {spawn, type ChildProcess} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createServer} from 'node:net';

// Always allocate a new database. Never accept an external URL or ATLAS_DATA_DIR.
export async function isolatedServer(assistantStub = false) {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-e2e-'));
  const reservation = createServer();
  await new Promise<void>((yes, no) => { reservation.once('error', no); reservation.listen(0, '127.0.0.1', yes); });
  const port = (reservation.address() as {port: number}).port;
  await new Promise<void>((yes, no) => reservation.close(e => e ? no(e) : yes()));
  const url = `http://127.0.0.1:${port}`;
  let child: ChildProcess | undefined;
  let logs = '';
  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>(yes => {
      const timeout = setTimeout(() => child?.kill('SIGKILL'), 3000);
      child!.once('exit', () => { clearTimeout(timeout); yes(); });
      child!.kill('SIGTERM');
    });
  }
  async function start() {
    child = spawn(process.execPath, [...(assistantStub?['--import',resolve('tests/e2e/support/openai-stub.mjs')]:[]),'local-dist/server.mjs'], {
      cwd: resolve('.'),
      env: {...process.env, ATLAS_DATA_DIR: directory, ATLAS_PORT: String(port), OPENAI_API_KEY: assistantStub?'sk-ficticia-teste-sem-chamada-externa':'', ATLAS_OPENAI_MODEL: assistantStub?'modelo-ficticio':''},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise<void>((yes, no) => {
      const timeout = setTimeout(() => finish(Error('Servidor de teste não iniciou.\n' + logs)), 15000);
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        child!.off('error', fail); child!.off('exit', exited); child!.stdout!.off('data', ready);
        error ? no(error) : yes();
      };
      const fail = (error: Error) => finish(error);
      const exited = () => finish(Error('Servidor de teste encerrou.\n' + logs));
      const ready = (data: Buffer) => { if (data.toString().includes(`http://localhost:${port}`)) finish(); };
      child!.stdout!.on('data', data => { logs += data.toString(); });
      child!.stderr!.on('data', data => { logs += data.toString(); });
      child!.stdout!.on('data', ready); child!.once('error', fail); child!.once('exit', exited);
    });
  }
  try { await start(); } catch (error) { await stop(); await rm(directory, {recursive: true, force: true}); throw error; }
  return {url, logs: () => logs, restart: async () => { await stop(); await start(); },
    close: async () => { await stop(); await rm(directory, {recursive: true, force: true}); }};
}
