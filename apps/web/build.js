import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const child = spawn(pnpm, ['build'], {
  cwd: __dirname,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code);
});