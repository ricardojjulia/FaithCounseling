import { cleanupFixtureClients } from './lib/clientArtifactCleanup.mjs';
import pool from '../apps/api/src/db/pool.js';

try {
  const result = await cleanupFixtureClients();

  if (result.skipped) {
    console.log('cleanup-client-fixtures', 'skipped', 'DB environment not configured');
    process.exit(0);
  }

  console.log(JSON.stringify({
    action: 'cleanup-client-fixtures',
    clientIds: result.clientIds,
    deleted: result.deleted,
  }, null, 2));
  await pool.end();
} catch (error) {
  await pool.end().catch(() => {});
  console.error(error.message || error);
  process.exit(1);
}
