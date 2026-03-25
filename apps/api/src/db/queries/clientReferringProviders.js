/**
 * Client referring provider query helpers.
 *
 * PHI columns: provider_name_enc, phone_enc, fax_enc, referral_notes_enc use
 * encrypt/decrypt.  address_enc stores a full address JSON object and uses
 * encryptJson/decryptJson.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt, encryptJson, decryptJson } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToReferringProvider(row) {
  return {
    id:              row.id,
    tenantId:        row.tenant_id,
    clientId:        row.client_id,
    providerName:    decrypt(row.provider_name_enc),
    practiceName:    row.practice_name ?? null,
    npi:             row.npi ?? null,
    phone:           row.phone_enc != null ? decrypt(row.phone_enc) : null,
    fax:             row.fax_enc != null ? decrypt(row.fax_enc) : null,
    address:         row.address_enc != null ? decryptJson(row.address_enc) : null,
    referralDate:    row.referral_date ?? null,
    referralNotes:   row.referral_notes_enc != null ? decrypt(row.referral_notes_enc) : null,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all referring providers for a client (decrypted).
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listReferringProviders(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_referring_providers WHERE client_id = ? AND tenant_id = ? ORDER BY created_at ASC',
    [clientId, tenantId],
  );
  return rows.map(rowToReferringProvider);
}

/**
 * Returns a single referring provider record or null.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getReferringProvider(id, clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_referring_providers WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToReferringProvider(rows[0]) : null;
}

/**
 * Inserts a new referring provider record and returns the created object.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   providerName: string, practiceName?: string, npi?: string,
 *   phone?: string, fax?: string, address?: object,
 *   referralDate?: string, referralNotes?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createReferringProvider({
  id,
  tenantId,
  clientId,
  providerName,
  practiceName = null,
  npi = null,
  phone = null,
  fax = null,
  address = null,
  referralDate = null,
  referralNotes = null,
}) {
  await pool.query(
    `INSERT INTO client_referring_providers
       (id, tenant_id, client_id, provider_name_enc, practice_name, npi,
        phone_enc, fax_enc, address_enc, referral_date, referral_notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      encrypt(String(providerName)),
      practiceName ?? null,
      npi ?? null,
      phone != null ? encrypt(String(phone)) : null,
      fax != null ? encrypt(String(fax)) : null,
      address != null ? encryptJson(address) : null,
      referralDate ?? null,
      referralNotes != null ? encrypt(String(referralNotes)) : null,
    ],
  );
  return getReferringProvider(id, clientId, tenantId);
}

/**
 * Updates the given fields on a referring provider record and returns the updated object.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} updates  camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateReferringProvider(id, clientId, tenantId, updates) {
  const setClauses = [];
  const values = [];

  if (updates.providerName !== undefined) {
    setClauses.push('provider_name_enc = ?');
    values.push(updates.providerName != null ? encrypt(String(updates.providerName)) : null);
  }
  if (updates.practiceName !== undefined) {
    setClauses.push('practice_name = ?');
    values.push(updates.practiceName ?? null);
  }
  if (updates.npi !== undefined) {
    setClauses.push('npi = ?');
    values.push(updates.npi ?? null);
  }
  if (updates.phone !== undefined) {
    setClauses.push('phone_enc = ?');
    values.push(updates.phone != null ? encrypt(String(updates.phone)) : null);
  }
  if (updates.fax !== undefined) {
    setClauses.push('fax_enc = ?');
    values.push(updates.fax != null ? encrypt(String(updates.fax)) : null);
  }
  if (updates.address !== undefined) {
    setClauses.push('address_enc = ?');
    values.push(updates.address != null ? encryptJson(updates.address) : null);
  }
  if (updates.referralDate !== undefined) {
    setClauses.push('referral_date = ?');
    values.push(updates.referralDate ?? null);
  }
  if (updates.referralNotes !== undefined) {
    setClauses.push('referral_notes_enc = ?');
    values.push(updates.referralNotes != null ? encrypt(String(updates.referralNotes)) : null);
  }

  if (setClauses.length === 0) return getReferringProvider(id, clientId, tenantId);

  values.push(id, clientId, tenantId);
  await pool.query(
    `UPDATE client_referring_providers SET ${setClauses.join(', ')} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    values,
  );
  return getReferringProvider(id, clientId, tenantId);
}

/**
 * Deletes a referring provider record permanently.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteReferringProvider(id, clientId, tenantId) {
  await pool.query(
    'DELETE FROM client_referring_providers WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return { deleted: true };
}
