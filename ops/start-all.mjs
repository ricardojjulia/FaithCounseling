import { spawn } from 'node:child_process';
import process from 'node:process';

const node = process.execPath;
const cwd = process.cwd();

const apiPort = Number(process.env.API_PORT || process.env.PORT || 3001);
const webPort = Number(process.env.WEB_PORT || 3002);
const apiBaseUrl = process.env.API_BASE_URL || `http://127.0.0.1:${apiPort}`;

const children = [];
let shuttingDown = false;

async function isHttpOk(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    return response.ok;
  } catch {
    return false;
  }
}

function runStep(label, command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed (code=${code ?? 'null'} signal=${signal ?? 'none'})`));
    });

    child.on('error', reject);
  });
}

function spawnService(name, args, env = {}) {
  const child = spawn(node, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[start-all] ${name} exited unexpectedly (${reason}).`);
    shutdown(code && code !== 0 ? code : 1);
  });

  child.on('error', (error) => {
    if (shuttingDown) return;
    console.error(`[start-all] ${name} failed to start: ${error.message}`);
    shutdown(1);
  });

  children.push(child);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill('SIGKILL');
    }
    process.exit(exitCode);
  }, 1500).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  console.log('[start-all] Building web assets...');
  await runStep('web build', node, ['apps/web/build.js']);

  const apiHealthUrl = `http://127.0.0.1:${apiPort}/health`;
  const apiAlreadyRunning = await isHttpOk(apiHealthUrl);

  if (apiAlreadyRunning) {
    console.log(`[start-all] API already running on http://127.0.0.1:${apiPort} (reusing existing process).`);
  } else {
    if (process.env.DB_NAME) {
      console.log('[start-all] Running API migration...');
      await runStep('api migrate', node, ['--env-file=.env', 'apps/api/src/db/migrate.js']);
    }
    console.log(`[start-all] Starting API on http://127.0.0.1:${apiPort}`);
    spawnService('api', ['apps/api/src/index.js'], { PORT: String(apiPort) });
  }

  const webIndexUrl = `http://127.0.0.1:${webPort}/index.html`;
  const webAlreadyRunning = await isHttpOk(webIndexUrl);

  if (webAlreadyRunning) {
    console.log(`[start-all] Web already running on http://127.0.0.1:${webPort} (reusing existing process).`);
  } else {
    console.log(`[start-all] Starting web on http://127.0.0.1:${webPort}`);
    spawnService('web', ['apps/web/server.js'], {
      PORT: String(webPort),
      API_BASE_URL: apiBaseUrl,
    });
  }

  console.log('[start-all] Services started:');
  console.log(`  - Web app:     http://127.0.0.1:${webPort}/index.html`);
  console.log(`  - About page:  http://127.0.0.1:${webPort}/about.html`);
  console.log(`  - Monitor:     http://127.0.0.1:${webPort}/monitor.html`);
  console.log(`  - Swagger UI:  http://127.0.0.1:${webPort}/api/docs`);
  console.log(`  - OpenAPI:     http://127.0.0.1:${webPort}/api/openapi.yaml`);
  console.log(`  - API direct:  http://127.0.0.1:${apiPort}/docs`);
}

main().catch((error) => {
  console.error(`[start-all] ${error.message}`);
  process.exit(1);
});
