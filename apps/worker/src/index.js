import pg from 'pg';
import { decrypt } from './decrypt.js';
import { sendEmail, sendSms } from './notify.js';

const workerName = 'reminder-worker';
const { Pool } = pg;

console.log(`${workerName} initialized`);

// ---------------------------------------------------------------------------
// Pool registry — one pool per tenant, created on first use
// ---------------------------------------------------------------------------

const tenantPools = new Map();

function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function adaptResult(result) {
  const rows = result.rows ?? [];
  rows.affectedRows = result.rowCount ?? 0;
  return [rows, result.fields ?? []];
}

function getPool(tenantId, config) {
  if (tenantPools.has(tenantId)) return tenantPools.get(tenantId);
  const pgPool = new Pool({
    host: config.host || '127.0.0.1',
    port: Number(config.port || 57322),
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: String(config.ssl).toLowerCase() === 'true' ? { rejectUnauthorized: true } : false,
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  pgPool.on('error', () => {});
  const pool = {
    query(sql, params = []) {
      return pgPool.query(toPositional(sql), params).then(adaptResult);
    },
    end() {
      return pgPool.end();
    },
  };
  tenantPools.set(tenantId, pool);
  return pool;
}

function defaultDbConfigFromEnv() {
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: process.env.DB_PORT ?? 57322,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL ?? 'false',
  };
}

function normalizeTenantConfig(tenantId, config) {
  return {
    tenantId,
    config: {
      ...defaultDbConfigFromEnv(),
      ...(config && typeof config === 'object' ? config : {}),
    },
  };
}

function tenantConfigsFromMap(map) {
  return Object.entries(map).map(([tenantId, config]) => {
    const database = typeof config === 'string' ? config : config?.database;
    return normalizeTenantConfig(tenantId, {
      ...(typeof config === 'object' ? config : {}),
      database: database || process.env.DB_NAME,
    });
  });
}

async function closeAllPools() {
  await Promise.allSettled([...tenantPools.values()].map((p) => p.end()));
  tenantPools.clear();
}

// ---------------------------------------------------------------------------
// Tenant resolution — TENANT_DB_MAP (multi-tenant) or DB_NAME (single-tenant)
// ---------------------------------------------------------------------------

function resolveTenantConfigs() {
  if (process.env.TENANT_DB_MAP) {
    try {
      const map = JSON.parse(process.env.TENANT_DB_MAP);
      if (map && typeof map === 'object') {
        return tenantConfigsFromMap(map);
      }
    } catch {
      console.error(`[${workerName}] Invalid TENANT_DB_MAP JSON — falling back to DB_NAME`);
    }
  }

  if (process.env.DB_NAME) {
    return [normalizeTenantConfig('system', defaultDbConfigFromEnv())];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Reminder processing — scoped to one tenant pool
// ---------------------------------------------------------------------------

async function getClientContact(pool, clientId, tenantId) {
  const [[client]] = await pool.query(
    `SELECT email_enc FROM clients WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [clientId, tenantId],
  );
  const [[phone]] = await pool.query(
    `SELECT number_enc FROM client_phones
     WHERE client_id = ? AND tenant_id = ? AND ok_to_text = TRUE
     ORDER BY is_preferred DESC LIMIT 1`,
    [clientId, tenantId],
  );
  return {
    email: client?.email_enc ? decrypt(client.email_enc) : null,
    phone: phone?.number_enc ? decrypt(phone.number_enc) : null,
  };
}

async function processDueReminders(pool, tenantId) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [rows] = await pool.query(
    `SELECT id, tenant_id, appointment_id, client_id, reminder_type, delivery_channel
     FROM reminders
     WHERE status = 'pending' AND reminder_at <= ? AND tenant_id = ?
     LIMIT 100`,
    [now, tenantId],
  );

  if (rows.length === 0) return;

  console.log(`[${workerName}] [${tenantId}] Processing ${rows.length} due reminder(s)`);

  for (const row of rows) {
    try {
      const [[fresh]] = await pool.query(
        `SELECT status FROM reminders WHERE id = ? AND tenant_id = ?`,
        [row.id, row.tenant_id],
      );
      if (!fresh || fresh.status !== 'pending') {
        console.log(`[${workerName}] [${tenantId}] Skipping reminder (status=${fresh?.status ?? 'gone'})`);
        continue;
      }

      const channel = row.delivery_channel;
      // Do NOT log client_id or appointment_id — user-linked identifiers.
      console.log(`[${workerName}] [${tenantId}] Dispatching ${channel} reminder (type=${row.reminder_type})`);

      if (row.client_id) {
        const contact = await getClientContact(pool, row.client_id, row.tenant_id);

        if (channel === 'email' || channel === 'both') {
          if (contact.email) {
            const result = await sendEmail({
              to: contact.email,
              subject: 'Appointment Reminder',
              // TODO: enrich with appointment date/time by joining appointments table
              text: 'This is a reminder about your upcoming appointment. Please contact your counselor if you need to reschedule.',
            });
            if (!result.sent) {
              console.warn(`[${workerName}] [${tenantId}] Email skipped: ${result.reason}`);
            }
          } else {
            console.warn(`[${workerName}] [${tenantId}] No email on file for client — skipping email`);
          }
        }

        if (channel === 'sms' || channel === 'both') {
          if (contact.phone) {
            const result = await sendSms({
              to: contact.phone,
              body: 'Reminder: You have an upcoming appointment. Reply STOP to opt out.',
            });
            if (!result.sent) {
              console.warn(`[${workerName}] [${tenantId}] SMS skipped: ${result.reason}`);
            }
          } else {
            console.warn(`[${workerName}] [${tenantId}] No SMS-eligible phone on file — skipping SMS`);
          }
        }
      }

      await pool.query(
        `UPDATE reminders SET status = 'sent', sent_at = NOW() WHERE id = ? AND tenant_id = ?`,
        [row.id, row.tenant_id],
      );
    } catch (err) {
      console.error(`[${workerName}] [${tenantId}] Failed to process reminder:`, err.message);
    }
  }
}

async function expireStaleReminders(pool, tenantId) {
  const [result] = await pool.query(
    `UPDATE reminders
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'pending'
       AND reminder_at < (NOW() - INTERVAL '24 hours')
       AND tenant_id = ?`,
    [tenantId],
  );
  if (result.affectedRows > 0) {
    console.log(`[${workerName}] [${tenantId}] Expired ${result.affectedRows} stale reminder(s)`);
  }
}

// ---------------------------------------------------------------------------
// Poll loop — all tenants in parallel
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 60_000;
let shuttingDown = false;

async function pollAllTenants() {
  const tenantConfigs = resolveTenantConfigs();
  if (tenantConfigs.length === 0) return;

  await Promise.allSettled(
    tenantConfigs.map(async ({ tenantId, config }) => {
      const pool = getPool(tenantId, config);
      await Promise.all([
        processDueReminders(pool, tenantId),
        expireStaleReminders(pool, tenantId),
      ]);
    }),
  );
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

const tenantConfigs = resolveTenantConfigs();

if (tenantConfigs.length === 0) {
  console.log(`[${workerName}] No DB configured (TENANT_DB_MAP or DB_NAME) — polling disabled`);
} else {
  console.log(`[${workerName}] Starting poll for ${tenantConfigs.length} tenant(s) (interval=${POLL_INTERVAL_MS}ms)`);

  await pollAllTenants().catch((err) => console.error(`[${workerName}] Initial poll error:`, err.message));

  const intervalHandle = setInterval(() => {
    if (shuttingDown) return;
    pollAllTenants().catch((err) => console.error(`[${workerName}] Poll error:`, err.message));
  }, POLL_INTERVAL_MS);

  process.on('SIGTERM', async () => {
    console.log(`[${workerName}] SIGTERM received — draining and shutting down`);
    shuttingDown = true;
    clearInterval(intervalHandle);
    await closeAllPools();
    process.exit(0);
  });

  console.log(`[${workerName}] Reminder poll started`);
}
