/**
 * Client diagnosis query helpers.
 *
 * PHI columns (description_enc, notes_enc) are encrypted at write time and
 * decrypted at read time using AES-256-GCM helpers in lib/encrypt.js.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientDiagnosis(row) {
  return {
    id:           row.id,
    tenantId:     row.tenant_id,
    clientId:     row.client_id,
    codeSystem:   row.code_system,
    code:         row.code,
    description:  decrypt(row.description_enc),
    onsetDate:    row.onset_date ?? null,
    status:       row.status,
    isPrimary:    Boolean(row.is_primary),
    notes:        row.notes_enc != null ? decrypt(row.notes_enc) : null,
    diagnosedBy:  row.diagnosed_by ?? null,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all diagnoses for a client (decrypted).
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listClientDiagnoses(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_diagnoses WHERE client_id = ? AND tenant_id = ? ORDER BY is_primary DESC, created_at ASC',
    [clientId, tenantId],
  );
  return rows.map(rowToClientDiagnosis);
}

/**
 * Returns a single diagnosis record or null.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientDiagnosis(id, clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_diagnoses WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToClientDiagnosis(rows[0]) : null;
}

/**
 * Inserts a new diagnosis record and returns the created object.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   codeSystem?: string, code: string, description: string,
 *   onsetDate?: string, status?: string, isPrimary?: boolean,
 *   notes?: string, diagnosedBy?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createClientDiagnosis({
  id,
  tenantId,
  clientId,
  codeSystem = 'DSM-5',
  code,
  description,
  onsetDate = null,
  status = 'active',
  isPrimary = false,
  notes = null,
  diagnosedBy = null,
}) {
  await pool.query(
    `INSERT INTO client_diagnoses
       (id, tenant_id, client_id, code_system, code, description_enc,
        onset_date, status, is_primary, notes_enc, diagnosed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      codeSystem,
      code,
      encrypt(String(description)),
      onsetDate ?? null,
      status,
      isPrimary ? 1 : 0,
      notes != null ? encrypt(String(notes)) : null,
      diagnosedBy ?? null,
    ],
  );
  return getClientDiagnosis(id, clientId, tenantId);
}

/**
 * Updates the given fields on a diagnosis record and returns the updated object.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} updates  camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateClientDiagnosis(id, clientId, tenantId, updates) {
  const setClauses = [];
  const values = [];

  if (updates.codeSystem !== undefined) {
    setClauses.push('code_system = ?');
    values.push(updates.codeSystem);
  }
  if (updates.code !== undefined) {
    setClauses.push('code = ?');
    values.push(updates.code);
  }
  if (updates.description !== undefined) {
    setClauses.push('description_enc = ?');
    values.push(updates.description != null ? encrypt(String(updates.description)) : null);
  }
  if (updates.onsetDate !== undefined) {
    setClauses.push('onset_date = ?');
    values.push(updates.onsetDate ?? null);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.isPrimary !== undefined) {
    setClauses.push('is_primary = ?');
    values.push(updates.isPrimary ? 1 : 0);
  }
  if (updates.notes !== undefined) {
    setClauses.push('notes_enc = ?');
    values.push(updates.notes != null ? encrypt(String(updates.notes)) : null);
  }
  if (updates.diagnosedBy !== undefined) {
    setClauses.push('diagnosed_by = ?');
    values.push(updates.diagnosedBy ?? null);
  }

  if (setClauses.length === 0) return getClientDiagnosis(id, clientId, tenantId);

  values.push(id, clientId, tenantId);
  await pool.query(
    `UPDATE client_diagnoses SET ${setClauses.join(', ')} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    values,
  );
  return getClientDiagnosis(id, clientId, tenantId);
}

/**
 * Deletes a diagnosis record permanently.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteClientDiagnosis(id, clientId, tenantId) {
  await pool.query(
    'DELETE FROM client_diagnoses WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return { deleted: true };
}
