/**
 * Client allergy query helpers.
 *
 * PHI columns (substance_enc, reaction_enc) are encrypted at write time and
 * decrypted at read time using AES-256-GCM helpers in lib/encrypt.js.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientAllergy(row) {
  return {
    id:          row.id,
    tenantId:    row.tenant_id,
    clientId:    row.client_id,
    substance:   decrypt(row.substance_enc),
    reaction:    row.reaction_enc != null ? decrypt(row.reaction_enc) : null,
    severity:    row.severity,
    allergyType: row.allergy_type,
    onsetDate:   row.onset_date ?? null,
    isActive:    Boolean(row.is_active),
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all allergy records for a client (decrypted).
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listClientAllergies(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_allergies WHERE client_id = ? AND tenant_id = ? ORDER BY is_active DESC, created_at ASC',
    [clientId, tenantId],
  );
  return rows.map(rowToClientAllergy);
}

/**
 * Returns a single allergy record or null.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientAllergy(id, clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_allergies WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToClientAllergy(rows[0]) : null;
}

/**
 * Inserts a new allergy record and returns the created object.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   substance: string, reaction?: string,
 *   severity?: string, allergyType?: string,
 *   onsetDate?: string, isActive?: boolean
 * }} data
 * @returns {Promise<object>}
 */
export async function createClientAllergy({
  id,
  tenantId,
  clientId,
  substance,
  reaction = null,
  severity = 'unknown',
  allergyType = 'drug',
  onsetDate = null,
  isActive = true,
}) {
  await pool.query(
    `INSERT INTO client_allergies
       (id, tenant_id, client_id, substance_enc, reaction_enc,
        severity, allergy_type, onset_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      encrypt(String(substance)),
      reaction != null ? encrypt(String(reaction)) : null,
      severity,
      allergyType,
      onsetDate ?? null,
      isActive ? 1 : 0,
    ],
  );
  return getClientAllergy(id, clientId, tenantId);
}

/**
 * Updates the given fields on an allergy record and returns the updated object.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} updates  camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateClientAllergy(id, clientId, tenantId, updates) {
  const setClauses = [];
  const values = [];

  if (updates.substance !== undefined) {
    setClauses.push('substance_enc = ?');
    values.push(updates.substance != null ? encrypt(String(updates.substance)) : null);
  }
  if (updates.reaction !== undefined) {
    setClauses.push('reaction_enc = ?');
    values.push(updates.reaction != null ? encrypt(String(updates.reaction)) : null);
  }
  if (updates.severity !== undefined) {
    setClauses.push('severity = ?');
    values.push(updates.severity);
  }
  if (updates.allergyType !== undefined) {
    setClauses.push('allergy_type = ?');
    values.push(updates.allergyType);
  }
  if (updates.onsetDate !== undefined) {
    setClauses.push('onset_date = ?');
    values.push(updates.onsetDate ?? null);
  }
  if (updates.isActive !== undefined) {
    setClauses.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }

  if (setClauses.length === 0) return getClientAllergy(id, clientId, tenantId);

  values.push(id, clientId, tenantId);
  await pool.query(
    `UPDATE client_allergies SET ${setClauses.join(', ')} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    values,
  );
  return getClientAllergy(id, clientId, tenantId);
}

/**
 * Deletes an allergy record permanently.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteClientAllergy(id, clientId, tenantId) {
  await pool.query(
    'DELETE FROM client_allergies WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return { deleted: true };
}
