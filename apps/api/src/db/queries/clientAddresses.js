/**
 * Client address query helpers.
 *
 * PHI columns (line1_enc, line2_enc, city_enc, postal_enc) are encrypted at
 * write time and decrypted at read time using AES-256-GCM helpers in
 * lib/encrypt.js.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientAddress(row) {
  return {
    id:          row.id,
    tenantId:    row.tenant_id,
    clientId:    row.client_id,
    addrType:    row.addr_type,
    line1:       decrypt(row.line1_enc),
    line2:       row.line2_enc != null ? decrypt(row.line2_enc) : null,
    city:        decrypt(row.city_enc),
    state:       row.state,
    postal:      decrypt(row.postal_enc),
    country:     row.country,
    isPreferred: Boolean(row.is_preferred),
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all addresses for a client (decrypted).
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listClientAddresses(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_addresses WHERE client_id = ? AND tenant_id = ? ORDER BY is_preferred DESC, created_at ASC',
    [clientId, tenantId],
  );
  return rows.map(rowToClientAddress);
}

/**
 * Returns a single client address or null.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientAddress(id, clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_addresses WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToClientAddress(rows[0]) : null;
}

/**
 * Inserts a new client address and returns the created object.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   addrType?: string, line1: string, line2?: string,
 *   city: string, state: string, postal: string,
 *   country?: string, isPreferred?: boolean
 * }} data
 * @returns {Promise<object>}
 */
export async function createClientAddress({
  id,
  tenantId,
  clientId,
  addrType = 'primary',
  line1,
  line2 = null,
  city,
  state,
  postal,
  country = 'US',
  isPreferred = false,
}) {
  await pool.query(
    `INSERT INTO client_addresses
       (id, tenant_id, client_id, addr_type, line1_enc, line2_enc, city_enc,
        state, postal_enc, country, is_preferred)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      addrType,
      line1 != null ? encrypt(String(line1)) : null,
      line2 != null ? encrypt(String(line2)) : null,
      city != null ? encrypt(String(city)) : null,
      state,
      postal != null ? encrypt(String(postal)) : null,
      country,
      isPreferred ? 1 : 0,
    ],
  );
  return getClientAddress(id, clientId, tenantId);
}

/**
 * Updates the given fields on a client address and returns the updated object.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} updates  camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateClientAddress(id, clientId, tenantId, updates) {
  const setClauses = [];
  const values = [];

  if (updates.addrType !== undefined) {
    setClauses.push('addr_type = ?');
    values.push(updates.addrType);
  }
  if (updates.line1 !== undefined) {
    setClauses.push('line1_enc = ?');
    values.push(updates.line1 != null ? encrypt(String(updates.line1)) : null);
  }
  if (updates.line2 !== undefined) {
    setClauses.push('line2_enc = ?');
    values.push(updates.line2 != null ? encrypt(String(updates.line2)) : null);
  }
  if (updates.city !== undefined) {
    setClauses.push('city_enc = ?');
    values.push(updates.city != null ? encrypt(String(updates.city)) : null);
  }
  if (updates.state !== undefined) {
    setClauses.push('state = ?');
    values.push(updates.state);
  }
  if (updates.postal !== undefined) {
    setClauses.push('postal_enc = ?');
    values.push(updates.postal != null ? encrypt(String(updates.postal)) : null);
  }
  if (updates.country !== undefined) {
    setClauses.push('country = ?');
    values.push(updates.country);
  }
  if (updates.isPreferred !== undefined) {
    setClauses.push('is_preferred = ?');
    values.push(updates.isPreferred ? 1 : 0);
  }

  if (setClauses.length === 0) return getClientAddress(id, clientId, tenantId);

  values.push(id, clientId, tenantId);
  await pool.query(
    `UPDATE client_addresses SET ${setClauses.join(', ')} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    values,
  );
  return getClientAddress(id, clientId, tenantId);
}

/**
 * Deletes a client address permanently.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteClientAddress(id, clientId, tenantId) {
  await pool.query(
    'DELETE FROM client_addresses WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return { deleted: true };
}
