/**
 * Client domain query helpers.
 *
 * Covers: clients, client_lifecycles, appointments.
 *
 * PHI columns (first_name_enc, last_name_enc, emergency_contact_enc,
 * client_name_enc, counselor_name_enc) are always encrypted at write time
 * and decrypted at read time using the field-level AES-256-GCM helpers
 * in lib/encrypt.js.
 *
 * All queries use parameterized PostgreSQL syntax — no string interpolation in SQL.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToClient(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    firstName: decrypt(row.first_name_enc),
    lastName: decrypt(row.last_name_enc),
    status: row.status,
    faithBackground: row.faith_background ?? null,
    highTouchpoint: Boolean(row.high_touchpoint),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLifecycle(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    tenantId: row.tenant_id,
    caseStatus: row.case_status,
    referralSource: row.referral_source ?? null,
    emergencyContact:
      row.emergency_contact_enc ? JSON.parse(decrypt(row.emergency_contact_enc)) : null,
    dischargeRecord:
      typeof row.discharge_record === 'string'
        ? JSON.parse(row.discharge_record)
        : (row.discharge_record ?? null),
    updatedAt: row.updated_at,
  };
}

function rowToAppointment(row) {
  const startsAt = row.starts_at ?? row.scheduled_at ?? null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id ?? null,
    counselorId: row.counselor_id ?? null,
    clientName: decrypt(row.client_name_enc),
    counselorName: decrypt(row.counselor_name_enc),
    appointmentType: row.appointment_type,
    status: row.status,
    scheduledAt: startsAt,
    durationMinutes: row.duration_minutes,
    locationId: row.location_id ?? null,
    remoteSession: Boolean(row.remote_session),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Clients ──────────────────────────────────────────────────────────────────

/**
 * Returns all clients for the given tenant (decrypted).
 * @param {string} tenantId
 * @param {{ status?: string }} [opts]
 * @returns {Promise<object[]>}
 */
export async function listClients(tenantId, { status } = {}) {
  if (status) {
    const [rows] = await pool.query(
      'SELECT * FROM clients WHERE tenant_id = ? AND status = ? ORDER BY created_at ASC',
      [tenantId, status],
    );
    return rows.map(rowToClient);
  }
  const [rows] = await pool.query(
    'SELECT * FROM clients WHERE tenant_id = ? ORDER BY created_at ASC',
    [tenantId],
  );
  return rows.map(rowToClient);
}

/**
 * Returns a single client or null.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM clients WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? rowToClient(rows[0]) : null;
}

/**
 * Inserts a new client and returns the created object.
 * @param {{
 *   id: string, tenantId: string,
 *   firstName: string, lastName: string,
 *   status?: string, faithBackground?: string, highTouchpoint?: boolean
 * }} data
 * @returns {Promise<object>}
 */
export async function createClient({
  id,
  tenantId,
  firstName,
  lastName,
  status = 'active',
  faithBackground = null,
  highTouchpoint = false,
}) {
  await pool.query(
    `INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, encrypt(firstName), encrypt(lastName), status, faithBackground, highTouchpoint ? 1 : 0],
  );
  return getClientById(id, tenantId);
}

/**
 * Updates the given fields on a client and returns the updated object.
 * @param {string} id
 * @param {string} tenantId
 * @param {Partial<object>} fields  camelCase client field names
 * @returns {Promise<object|null>}
 */
export async function updateClient(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.firstName !== undefined) {
    setClauses.push('first_name_enc = ?');
    values.push(encrypt(fields.firstName));
  }
  if (fields.lastName !== undefined) {
    setClauses.push('last_name_enc = ?');
    values.push(encrypt(fields.lastName));
  }
  if (fields.status !== undefined) {
    setClauses.push('status = ?');
    values.push(fields.status);
  }
  if (fields.faithBackground !== undefined) {
    setClauses.push('faith_background = ?');
    values.push(fields.faithBackground);
  }
  if (fields.highTouchpoint !== undefined) {
    setClauses.push('high_touchpoint = ?');
    values.push(fields.highTouchpoint ? 1 : 0);
  }

  if (setClauses.length === 0) return getClientById(id, tenantId);

  values.push(id, tenantId);
  await pool.query(
    `UPDATE clients SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
    values,
  );
  return getClientById(id, tenantId);
}

/**
 * Soft-deletes a client by setting status to 'inactive'.
 * Returns the updated client object.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function deactivateClient(id, tenantId) {
  await pool.query(
    "UPDATE clients SET status = 'inactive' WHERE id = ? AND tenant_id = ? AND status != 'inactive'",
    [id, tenantId],
  );
  return getClientById(id, tenantId);
}

// ─── Client lifecycles ────────────────────────────────────────────────────────

/**
 * Returns the lifecycle record for a client, or null if none exists.
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getLifecycle(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_lifecycles WHERE client_id = ? AND tenant_id = ?',
    [clientId, tenantId],
  );
  return rows.length ? rowToLifecycle(rows[0]) : null;
}

/**
 * Inserts a new lifecycle record and returns it.
 * @param {{
 *   id: string, clientId: string, tenantId: string,
 *   caseStatus?: string, referralSource?: string,
 *   emergencyContact?: object, dischargeRecord?: object
 * }} data
 * @returns {Promise<object>}
 */
export async function createLifecycle({
  id,
  clientId,
  tenantId,
  caseStatus = 'active',
  referralSource = null,
  emergencyContact = null,
  dischargeRecord = null,
}) {
  await pool.query(
    `INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source,
        emergency_contact_enc, discharge_record)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      clientId,
      tenantId,
      caseStatus,
      referralSource,
      emergencyContact != null ? encrypt(JSON.stringify(emergencyContact)) : null,
      dischargeRecord != null ? JSON.stringify(dischargeRecord) : null,
    ],
  );
  return getLifecycle(clientId, tenantId);
}

/**
 * Updates the given fields on a lifecycle record and returns the updated object.
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} fields
 * @returns {Promise<object|null>}
 */
export async function updateLifecycle(clientId, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.caseStatus !== undefined) {
    setClauses.push('case_status = ?');
    values.push(fields.caseStatus);
  }
  if (fields.referralSource !== undefined) {
    setClauses.push('referral_source = ?');
    values.push(fields.referralSource);
  }
  if (fields.emergencyContact !== undefined) {
    setClauses.push('emergency_contact_enc = ?');
    values.push(
      fields.emergencyContact != null
        ? encrypt(JSON.stringify(fields.emergencyContact))
        : null,
    );
  }
  if (fields.dischargeRecord !== undefined) {
    setClauses.push('discharge_record = ?');
    values.push(
      fields.dischargeRecord != null ? JSON.stringify(fields.dischargeRecord) : null,
    );
  }

  if (setClauses.length === 0) return getLifecycle(clientId, tenantId);

  values.push(clientId, tenantId);
  await pool.query(
    `UPDATE client_lifecycles SET ${setClauses.join(', ')} WHERE client_id = ? AND tenant_id = ?`,
    values,
  );
  return getLifecycle(clientId, tenantId);
}

// ─── Appointments ─────────────────────────────────────────────────────────────

/**
 * Returns all appointments for the given tenant, optionally filtered.
 * @param {string} tenantId
 * @param {{ clientId?: string, counselorId?: string, status?: string }} [opts]
 * @returns {Promise<object[]>}
 */
export async function listAppointments(tenantId, { clientId, counselorId, status } = {}) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];

  if (clientId !== undefined) {
    conditions.push('client_id = ?');
    values.push(clientId);
  }
  if (counselorId !== undefined) {
    conditions.push('counselor_id = ?');
    values.push(counselorId);
  }
  if (status !== undefined) {
    conditions.push('status = ?');
    values.push(status);
  }

  const [rows] = await pool.query(
    `SELECT * FROM appointments WHERE ${conditions.join(' AND ')} ORDER BY scheduled_at ASC`,
    values,
  );
  return rows.map(rowToAppointment);
}

/**
 * Returns a single appointment or null.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getAppointmentById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM appointments WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? rowToAppointment(rows[0]) : null;
}

/**
 * Inserts a new appointment and returns the created object.
 * @param {{
 *   id: string, tenantId: string,
 *   clientId?: string, counselorId?: string,
 *   clientName?: string, counselorName?: string,
 *   appointmentType: string, status?: string,
 *   scheduledAt?: Date|string, durationMinutes?: number,
 *   locationId?: string, remoteSession?: boolean
 * }} data
 * @returns {Promise<object>}
 */
export async function createAppointment({
  id,
  tenantId,
  clientId = null,
  counselorId = null,
  clientName = null,
  counselorName = null,
  appointmentType,
  status = 'scheduled',
  scheduledAt = null,
  durationMinutes = 50,
  locationId = null,
  remoteSession = false,
}) {
  const scheduledAtSql = toSqlTimestamp(scheduledAt);
  await pool.query(
    `INSERT INTO appointments
       (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc,
        appointment_type, status, starts_at, scheduled_at, duration_minutes,
        location_id, remote_session)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      counselorId,
      encrypt(clientName),
      encrypt(counselorName),
      appointmentType,
      status,
      scheduledAtSql,
      scheduledAtSql,
      durationMinutes,
      locationId,
      remoteSession ? 1 : 0,
    ],
  );
  return getAppointmentById(id, tenantId);
}

/**
 * Updates the given fields on an appointment and returns the updated object.
 * @param {string} id
 * @param {string} tenantId
 * @param {Partial<object>} fields
 * @returns {Promise<object|null>}
 */
export async function updateAppointment(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.clientId !== undefined) {
    setClauses.push('client_id = ?');
    values.push(fields.clientId);
  }
  if (fields.counselorId !== undefined) {
    setClauses.push('counselor_id = ?');
    values.push(fields.counselorId);
  }
  if (fields.clientName !== undefined) {
    setClauses.push('client_name_enc = ?');
    values.push(encrypt(fields.clientName));
  }
  if (fields.counselorName !== undefined) {
    setClauses.push('counselor_name_enc = ?');
    values.push(encrypt(fields.counselorName));
  }
  if (fields.appointmentType !== undefined) {
    setClauses.push('appointment_type = ?');
    values.push(fields.appointmentType);
  }
  if (fields.status !== undefined) {
    setClauses.push('status = ?');
    values.push(fields.status);
  }
  if (fields.scheduledAt !== undefined) {
    const scheduledAtSql = toSqlTimestamp(fields.scheduledAt);
    setClauses.push('starts_at = ?');
    values.push(scheduledAtSql);
    setClauses.push('scheduled_at = ?');
    values.push(scheduledAtSql);
  }
  if (fields.durationMinutes !== undefined) {
    setClauses.push('duration_minutes = ?');
    values.push(fields.durationMinutes);
  }
  if (fields.locationId !== undefined) {
    setClauses.push('location_id = ?');
    values.push(fields.locationId);
  }
  if (fields.remoteSession !== undefined) {
    setClauses.push('remote_session = ?');
    values.push(fields.remoteSession ? 1 : 0);
  }

  if (setClauses.length === 0) return getAppointmentById(id, tenantId);

  values.push(id, tenantId);
  await pool.query(
    `UPDATE appointments SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
    values,
  );
  return getAppointmentById(id, tenantId);
}

/**
 * Deletes an appointment permanently.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteAppointment(id, tenantId) {
  await pool.query(
    'DELETE FROM appointments WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return { deleted: true };
}

function toSqlTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
