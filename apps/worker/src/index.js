import { createAuditEvent } from '../../../packages/domain/src/index.js';
import { createServiceTelemetry, startNodeTelemetry } from '../../../packages/telemetry/src/index.js';

const workerName = 'reminder-worker';
await startNodeTelemetry({ serviceName: workerName });
const telemetry = createServiceTelemetry(workerName);

const startupEvent = createAuditEvent({
  tenantId: 'system',
  action: 'worker.start',
  targetType: 'worker',
  targetId: workerName,
  occurredAt: new Date().toISOString(),
});

telemetry.recordMutation('worker.start');

console.log(`${workerName} initialized`);
console.log(JSON.stringify(startupEvent, null, 2));

// ---------------------------------------------------------------------------
// Reminder polling — only runs when DB_NAME is configured
// ---------------------------------------------------------------------------

if (process.env.DB_NAME) {
  const mysql = await import('mysql2/promise');

  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    connectionLimit: 3,
    waitForConnections: true,
  });

  const POLL_INTERVAL_MS = 60_000;

  async function processDueReminders() {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [rows] = await pool.query(
      `SELECT id, tenant_id, appointment_id, client_id, reminder_type, delivery_channel
       FROM reminders
       WHERE status = 'pending' AND reminder_at <= ?
       LIMIT 100`,
      [now]
    );

    if (rows.length === 0) return;

    console.log(`[${workerName}] Processing ${rows.length} due reminder(s)`);

    for (const row of rows) {
      try {
        // In a production system this would dispatch an email/SMS via a
        // notification provider.  For now we log the intent and mark sent.
        console.log(
          `[${workerName}] Sending ${row.delivery_channel} reminder ` +
          `(type=${row.reminder_type}) for appointment ${row.appointment_id} ` +
          `to client ${row.client_id}`
        );

        await pool.query(
          `UPDATE reminders SET status = 'sent', sent_at = NOW() WHERE id = ? AND tenant_id = ?`,
          [row.id, row.tenant_id]
        );

        telemetry.recordMutation('reminder.sent');

        const auditEvent = createAuditEvent({
          tenantId: row.tenant_id,
          action: 'reminder.sent',
          targetType: 'reminder',
          targetId: row.id,
          occurredAt: new Date().toISOString(),
        });
        console.log(JSON.stringify(auditEvent));
      } catch (err) {
        console.error(`[${workerName}] Failed to process reminder ${row.id}:`, err.message);
      }
    }
  }

  // Run once immediately, then on an interval
  await processDueReminders().catch((err) => console.error(`[${workerName}] Poll error:`, err.message));
  setInterval(() => {
    processDueReminders().catch((err) => console.error(`[${workerName}] Poll error:`, err.message));
  }, POLL_INTERVAL_MS);

  console.log(`[${workerName}] Reminder poll started (interval=${POLL_INTERVAL_MS}ms)`);
} else {
  console.log(`[${workerName}] DB_NAME not set — reminder polling disabled`);
}
