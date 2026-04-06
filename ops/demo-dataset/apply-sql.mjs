import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { closeDemoDatasetPool, hasDbEnv, verifyDemoDataset } from './common.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const requireFromApiWorkspace = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const mysql = requireFromApiWorkspace('mysql2/promise');
const defaultSqlPath = path.join(currentDir, 'generated', 'demo-dataset.apply.sql');
const sqlPath = process.env.DEMO_SQL_PATH
  ? path.resolve(process.cwd(), process.env.DEMO_SQL_PATH)
  : defaultSqlPath;

if (!hasDbEnv()) {
  console.log(JSON.stringify({
    action: 'demo-dataset-apply-sql',
    skipped: true,
    reason: 'DB environment not configured',
  }, null, 2));
  process.exit(0);
}

try {
  const sql = await readFile(sqlPath, 'utf8');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    multipleStatements: true,
    timezone: 'Z',
  });

  try {
    await connection.query(sql);
  } finally {
    await connection.end();
  }

  const verification = await verifyDemoDataset();
  await closeDemoDatasetPool();

  console.log(JSON.stringify({
    action: 'demo-dataset-apply-sql',
    sqlPath,
    verification,
  }, null, 2));

  if (!verification.passed) {
    process.exit(1);
  }
} catch (error) {
  await closeDemoDatasetPool();
  console.error(error.message || error);
  process.exit(1);
}
