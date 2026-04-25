import { spawn, execSync } from 'node:child_process';
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


function dockerExec(cmd) {
  try { execSync(cmd, { stdio: 'pipe' }); return true; } catch { return false; }
}

function getListeningProcess(port) {
  try {
    const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -Fp`, { stdio: 'pipe', encoding: 'utf8' });
    const pidLine = output
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('p'));
    if (!pidLine) return null;
    const pid = Number(pidLine.slice(1));
    if (!Number.isInteger(pid) || pid <= 0) return null;
    const command = execSync(`ps -p ${pid} -o command=`, { stdio: 'pipe', encoding: 'utf8' }).trim();
    return { pid, command };
  } catch {
    return null;
  }
}

function isRepoManagedProcess(processInfo, scriptFragment) {
  return Boolean(processInfo?.command?.includes(scriptFragment));
}

async function waitForPortToClose(port, timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!getListeningProcess(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return !getListeningProcess(port);
}

async function restartRepoManagedProcessIfNeeded(name, port, scriptFragment) {
  const processInfo = getListeningProcess(port);
  if (!isRepoManagedProcess(processInfo, scriptFragment)) return false;

  console.log(`[start-all] Restarting existing ${name} on port ${port} to pick up current source...`);
  try {
    process.kill(processInfo.pid, 'SIGTERM');
  } catch {}

  const stoppedCleanly = await waitForPortToClose(port);
  if (!stoppedCleanly) {
    try {
      process.kill(processInfo.pid, 'SIGKILL');
    } catch {}
    await waitForPortToClose(port, 2_000);
  }

  return true;
}

async function ensureDatabase() {
  if (!process.env.DB_NAME) {
    console.log('[start-all] No DB_NAME configured — skipping database preflight.');
    return;
  }

  // Ensure Docker daemon is running
  if (!dockerExec('docker info')) {
    console.log('[start-all] Docker not running — launching Docker Desktop...');
    dockerExec('open -a Docker');
    process.stdout.write('[start-all] Waiting for Docker to start');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      if (dockerExec('docker info')) break;
      process.stdout.write('.');
    }
    process.stdout.write('\n');
    if (!dockerExec('docker info')) {
      console.error('[start-all] Docker did not start. Please launch Docker Desktop manually and retry.');
      process.exit(1);
    }
  }

  // Ensure MySQL container is up
  const isUp = dockerExec('docker compose ps --status running mysql 2>/dev/null | grep -q churchcore-postgres');
  if (!isUp) {
    console.log('[start-all] Starting MySQL container...');
    dockerExec('docker compose up -d mysql');
  }

  // Wait until MySQL is accepting connections
  const user = process.env.DB_USER || 'churchcore_app';
  const pass = process.env.DB_PASSWORD || '';
  process.stdout.write('[start-all] Waiting for MySQL');
  for (let i = 0; i < 30; i++) {
    const ok = dockerExec(`docker compose exec mysql mysqladmin ping -h 127.0.0.1 -u${user} -p${pass} --silent 2>/dev/null`);
    if (ok) { console.log(' ready.'); return; }
    await new Promise(r => setTimeout(r, 2000));
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  console.error('[start-all] MySQL did not become healthy in time. Check Docker logs.');
  process.exit(1);
}

async function main() {
  await ensureDatabase();
  console.log('[start-all] Building web assets...');
  await runStep('web build', node, ['apps/web/build.js']);

  const apiHealthUrl = `http://127.0.0.1:${apiPort}/health`;
  await restartRepoManagedProcessIfNeeded('API', apiPort, 'apps/api/src/index.js');
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
  await restartRepoManagedProcessIfNeeded('web', webPort, 'apps/web/server.js');
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

  spawnService('worker', ['apps/worker/src/index.js']);

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
