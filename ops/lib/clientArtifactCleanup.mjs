import pool from '../../apps/api/src/db/pool.js';
import { decrypt } from '../../apps/api/src/lib/encrypt.js';

const FIXTURE_MATCHERS = Object.freeze([
  { tenantId: 'system', firstName: 'Step12', lastName: 'Validation' },
  { tenantId: 'system', firstName: 'Dbg', lastName: 'Consent' },
]);

const CLIENT_CHILD_TABLES = Object.freeze([
  'portal_accounts',
  'portal_appointment_requests',
  'waitlist_metadata',
  'reminders',
  'appointments',
  'client_addresses',
  'client_phones',
  'client_contacts',
  'client_insurance',
  'client_referring_providers',
  'client_diagnoses',
  'client_medications',
  'client_allergies',
  'client_clinical_history',
  'client_faith_profiles',
  'client_legal',
  'client_lifecycles',
  'consent_records',
  'intake_packets',
  'treatment_plans',
  'progress_notes',
  'inventory_assignments',
  'faith_church_referrals',
  'portal_message_threads',
  'invoices',
]);

function hasDbEnv() {
  return Boolean(process.env.DB_NAME && process.env.DB_USER && process.env.DB_ENCRYPTION_KEY);
}

function placeholders(values) {
  return values.map(() => '?').join(',');
}

async function deleteByClientIds(connection, table, clientIds) {
  if (!clientIds.length) return 0;
  const [result] = await connection.query(
    `DELETE FROM ${table} WHERE client_id IN (${placeholders(clientIds)})`,
    clientIds,
  );
  return result.affectedRows ?? 0;
}

export async function findFixtureClientIds() {
  if (!hasDbEnv()) return [];

  const [rows] = await pool.query(
    'SELECT id, tenant_id, first_name_enc, last_name_enc FROM clients',
  );

  return rows
    .filter((row) => {
      const firstName = decrypt(row.first_name_enc);
      const lastName = decrypt(row.last_name_enc);
      return FIXTURE_MATCHERS.some((matcher) => (
        row.tenant_id === matcher.tenantId &&
        firstName === matcher.firstName &&
        lastName === matcher.lastName
      ));
    })
    .map((row) => row.id);
}

export async function cleanupClientArtifacts(clientIds) {
  if (!hasDbEnv() || !clientIds.length) {
    return {
      skipped: !hasDbEnv(),
      clientIds: clientIds ?? [],
      deleted: {},
    };
  }

  const connection = await pool.getConnection();
  const deleted = {};

  try {
    await connection.beginTransaction();

    const [invoiceRows] = await connection.query(
      `SELECT id FROM invoices WHERE client_id IN (${placeholders(clientIds)})`,
      clientIds,
    );
    const invoiceIds = invoiceRows.map((row) => row.id);

    const [threadRows] = await connection.query(
      `SELECT id FROM portal_message_threads WHERE client_id IN (${placeholders(clientIds)})`,
      clientIds,
    );
    const threadIds = threadRows.map((row) => row.id);

    if (invoiceIds.length) {
      for (const table of ['payments', 'superbills', 'claims']) {
        const [result] = await connection.query(
          `DELETE FROM ${table} WHERE invoice_id IN (${placeholders(invoiceIds)})`,
          invoiceIds,
        );
        deleted[table] = result.affectedRows ?? 0;
      }
    }

    if (threadIds.length) {
      const [result] = await connection.query(
        `DELETE FROM portal_messages WHERE thread_id IN (${placeholders(threadIds)})`,
        threadIds,
      );
      deleted.portal_messages = result.affectedRows ?? 0;
    }

    const [assignmentResult] = await connection.query(
      `DELETE FROM document_assignments
       WHERE assignee_type = 'client' AND assignee_id IN (${placeholders(clientIds)})`,
      clientIds,
    );
    deleted.document_assignments = assignmentResult.affectedRows ?? 0;

    for (const table of CLIENT_CHILD_TABLES) {
      deleted[table] = await deleteByClientIds(connection, table, clientIds);
    }

    const [clientResult] = await connection.query(
      `DELETE FROM clients WHERE id IN (${placeholders(clientIds)})`,
      clientIds,
    );
    deleted.clients = clientResult.affectedRows ?? 0;

    await connection.commit();
    return { skipped: false, clientIds, deleted };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cleanupFixtureClients() {
  const clientIds = await findFixtureClientIds();
  return cleanupClientArtifacts(clientIds);
}
