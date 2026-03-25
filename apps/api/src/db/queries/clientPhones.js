/**
 * Client phone query helpers.
 *
 * PHI column (number_enc) is encrypted at write time and decrypted at read
 * time using AES-256-GCM helpers in lib/encrypt.js.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientPhone(row) {
  return {
    id:           row.id,
    tenantId:     row.tenant_id,
    clientId:     row.client_id,
    phoneType:    row.phone_type,
    number:       decrypt(row.number_enc),
    extension:    row.extension ?? null,
    isPreferred:  Boolean(row.is_preferred),
    okToText:     Boolean(row.ok_to_text),
    okToLeaveMsg: Boolean(row.ok_to_leave_msg),
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all phone records for a client (decrypted).
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listClientPhones(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_phones WHERE client_id = ? AND tenant_id = ? ORDER BY is_preferred DESC, created_at ASC',
    [clientId, tenantId],
  );
  return rows.map(rowToClientPhone);
}

/**
 * Returns a single phone record or null.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientPhone(id, clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_phones WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToClientPhone(rows[0]) : null;
}

/**
 * Inserts a new client phone record and returns the created object.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   phoneType?: string, number: string, extension?: string,
 *   isPreferred?: boolean, okToText?: boolean, okToLeaveMsg?: boolean
 * }} data
 * @returns {Promise<object>}
 */
export async function createClientPhone({
  id,
  tenantId,
  clientId,
  phoneType = 'cell',
  number,
  extension = null,
  isPreferred = false,
  okToText = false,
  okToLeaveMsg = true,
}) {
  await pool.query(
    `INSERT INTO client_phones
       (id, tenant_id, client_id, phone_type, number_enc, extension,
        is_preferred, ok_to_text, ok_to_leave_msg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      phoneType,
      encrypt(String(number)),
      extension ?? null,
      isPreferred ? 1 : 0,
      okToText ? 1 : 0,
      okToLeaveMsg ? 1 : 0,
    ],
  );
  return getClientPhone(id, clientId, tenantId);
}

/**
 * Updates the given fields on a client phone record and returns the updated object.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} updates  camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateClientPhone(id, clientId, tenantId, updates) {
  const setClauses = [];
  const values = [];

  if (updates.phoneType !== undefined) {
    setClauses.push('phone_type = ?');
    values.push(updates.phoneType);
  }
  if (updates.number !== undefined) {
    setClauses.push('number_enc = ?');
    values.push(updates.number != null ? encrypt(String(updates.number)) : null);
  }
  if (updates.extension !== undefined) {
    setClauses.push('extension = ?');
    values.push(updates.extension ?? null);
  }
  if (updates.isPreferred !== undefined) {
    setClauses.push('is_preferred = ?');
    values.push(updates.isPreferred ? 1 : 0);
  }
  if (updates.okToText !== undefined) {
    setClauses.push('ok_to_text = ?');
    values.push(updates.okToText ? 1 : 0);
  }
  if (updates.okToLeaveMsg !== undefined) {
    setClauses.push('ok_to_leave_msg = ?');
    values.push(updates.okToLeaveMsg ? 1 : 0);
  }

  if (setClauses.length === 0) return getClientPhone(id, clientId, tenantId);

  values.push(id, clientId, tenantId);
  await pool.query(
    `UPDATE client_phones SET ${setClauses.join(', ')} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    values,
  );
  return getClientPhone(id, clientId, tenantId);
}

/**
 * Deletes a client phone record permanently.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteClientPhone(id, clientId, tenantId) {
  await pool.query(
    'DELETE FROM client_phones WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return { deleted: true };
}
