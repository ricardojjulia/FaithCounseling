/**
 * Client medication query helpers.
 *
 * PHI columns (med_name_enc, dose_enc, frequency_enc, prescriber_enc,
 * reason_enc, notes_enc) are encrypted at write time and decrypted at read
 * time using AES-256-GCM helpers in lib/encrypt.js.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientMedication(row) {
  return {
    id:          row.id,
    tenantId:    row.tenant_id,
    clientId:    row.client_id,
    medName:     decrypt(row.med_name_enc),
    dose:        row.dose_enc != null ? decrypt(row.dose_enc) : null,
    frequency:   row.frequency_enc != null ? decrypt(row.frequency_enc) : null,
    route:       row.route ?? null,
    prescriber:  row.prescriber_enc != null ? decrypt(row.prescriber_enc) : null,
    startDate:   row.start_date ?? null,
    endDate:     row.end_date ?? null,
    isActive:    Boolean(row.is_active),
    reason:      row.reason_enc != null ? decrypt(row.reason_enc) : null,
    notes:       row.notes_enc != null ? decrypt(row.notes_enc) : null,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all medications for a client (decrypted).
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listClientMedications(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_medications WHERE client_id = ? AND tenant_id = ? ORDER BY is_active DESC, created_at ASC',
    [clientId, tenantId],
  );
  return rows.map(rowToClientMedication);
}

/**
 * Returns a single medication record or null.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientMedication(id, clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_medications WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToClientMedication(rows[0]) : null;
}

/**
 * Inserts a new medication record and returns the created object.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   medName: string, dose?: string, frequency?: string,
 *   route?: string, prescriber?: string, startDate?: string,
 *   endDate?: string, isActive?: boolean, reason?: string, notes?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createClientMedication({
  id,
  tenantId,
  clientId,
  medName,
  dose = null,
  frequency = null,
  route = null,
  prescriber = null,
  startDate = null,
  endDate = null,
  isActive = true,
  reason = null,
  notes = null,
}) {
  await pool.query(
    `INSERT INTO client_medications
       (id, tenant_id, client_id, med_name_enc, dose_enc, frequency_enc,
        route, prescriber_enc, start_date, end_date, is_active, reason_enc, notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      encrypt(String(medName)),
      dose != null ? encrypt(String(dose)) : null,
      frequency != null ? encrypt(String(frequency)) : null,
      route ?? null,
      prescriber != null ? encrypt(String(prescriber)) : null,
      startDate ?? null,
      endDate ?? null,
      isActive ? 1 : 0,
      reason != null ? encrypt(String(reason)) : null,
      notes != null ? encrypt(String(notes)) : null,
    ],
  );
  return getClientMedication(id, clientId, tenantId);
}

/**
 * Updates the given fields on a medication record and returns the updated object.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} updates  camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateClientMedication(id, clientId, tenantId, updates) {
  const setClauses = [];
  const values = [];

  if (updates.medName !== undefined) {
    setClauses.push('med_name_enc = ?');
    values.push(updates.medName != null ? encrypt(String(updates.medName)) : null);
  }
  if (updates.dose !== undefined) {
    setClauses.push('dose_enc = ?');
    values.push(updates.dose != null ? encrypt(String(updates.dose)) : null);
  }
  if (updates.frequency !== undefined) {
    setClauses.push('frequency_enc = ?');
    values.push(updates.frequency != null ? encrypt(String(updates.frequency)) : null);
  }
  if (updates.route !== undefined) {
    setClauses.push('route = ?');
    values.push(updates.route ?? null);
  }
  if (updates.prescriber !== undefined) {
    setClauses.push('prescriber_enc = ?');
    values.push(updates.prescriber != null ? encrypt(String(updates.prescriber)) : null);
  }
  if (updates.startDate !== undefined) {
    setClauses.push('start_date = ?');
    values.push(updates.startDate ?? null);
  }
  if (updates.endDate !== undefined) {
    setClauses.push('end_date = ?');
    values.push(updates.endDate ?? null);
  }
  if (updates.isActive !== undefined) {
    setClauses.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.reason !== undefined) {
    setClauses.push('reason_enc = ?');
    values.push(updates.reason != null ? encrypt(String(updates.reason)) : null);
  }
  if (updates.notes !== undefined) {
    setClauses.push('notes_enc = ?');
    values.push(updates.notes != null ? encrypt(String(updates.notes)) : null);
  }

  if (setClauses.length === 0) return getClientMedication(id, clientId, tenantId);

  values.push(id, clientId, tenantId);
  await pool.query(
    `UPDATE client_medications SET ${setClauses.join(', ')} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    values,
  );
  return getClientMedication(id, clientId, tenantId);
}

/**
 * Deletes a medication record permanently.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteClientMedication(id, clientId, tenantId) {
  await pool.query(
    'DELETE FROM client_medications WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return { deleted: true };
}
