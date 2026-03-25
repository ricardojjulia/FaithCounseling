/**
 * Client contact (emergency / guardian) query helpers.
 *
 * PHI columns (name_enc, phone_enc, email_enc, notes_enc) are encrypted at
 * write time and decrypted at read time using AES-256-GCM helpers in
 * lib/encrypt.js.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientContact(row) {
  return {
    id:           row.id,
    tenantId:     row.tenant_id,
    clientId:     row.client_id,
    contactType:  row.contact_type,
    name:         decrypt(row.name_enc),
    relationship: row.relationship,
    phone:        decrypt(row.phone_enc),
    email:        row.email_enc != null ? decrypt(row.email_enc) : null,
    isPrimary:    Boolean(row.is_primary),
    hasLegalAuth: Boolean(row.has_legal_auth),
    notes:        row.notes_enc != null ? decrypt(row.notes_enc) : null,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all contacts for a client (decrypted).
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listClientContacts(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_contacts WHERE client_id = ? AND tenant_id = ? ORDER BY is_primary DESC, created_at ASC',
    [clientId, tenantId],
  );
  return rows.map(rowToClientContact);
}

/**
 * Returns a single client contact or null.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientContact(id, clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_contacts WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToClientContact(rows[0]) : null;
}

/**
 * Inserts a new client contact and returns the created object.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   contactType?: string, name: string, relationship: string,
 *   phone: string, email?: string, isPrimary?: boolean,
 *   hasLegalAuth?: boolean, notes?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createClientContact({
  id,
  tenantId,
  clientId,
  contactType = 'emergency',
  name,
  relationship,
  phone,
  email = null,
  isPrimary = false,
  hasLegalAuth = false,
  notes = null,
}) {
  await pool.query(
    `INSERT INTO client_contacts
       (id, tenant_id, client_id, contact_type, name_enc, relationship,
        phone_enc, email_enc, is_primary, has_legal_auth, notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      contactType,
      encrypt(String(name)),
      relationship,
      encrypt(String(phone)),
      email != null ? encrypt(String(email)) : null,
      isPrimary ? 1 : 0,
      hasLegalAuth ? 1 : 0,
      notes != null ? encrypt(String(notes)) : null,
    ],
  );
  return getClientContact(id, clientId, tenantId);
}

/**
 * Updates the given fields on a client contact and returns the updated object.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} updates  camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateClientContact(id, clientId, tenantId, updates) {
  const setClauses = [];
  const values = [];

  if (updates.contactType !== undefined) {
    setClauses.push('contact_type = ?');
    values.push(updates.contactType);
  }
  if (updates.name !== undefined) {
    setClauses.push('name_enc = ?');
    values.push(updates.name != null ? encrypt(String(updates.name)) : null);
  }
  if (updates.relationship !== undefined) {
    setClauses.push('relationship = ?');
    values.push(updates.relationship);
  }
  if (updates.phone !== undefined) {
    setClauses.push('phone_enc = ?');
    values.push(updates.phone != null ? encrypt(String(updates.phone)) : null);
  }
  if (updates.email !== undefined) {
    setClauses.push('email_enc = ?');
    values.push(updates.email != null ? encrypt(String(updates.email)) : null);
  }
  if (updates.isPrimary !== undefined) {
    setClauses.push('is_primary = ?');
    values.push(updates.isPrimary ? 1 : 0);
  }
  if (updates.hasLegalAuth !== undefined) {
    setClauses.push('has_legal_auth = ?');
    values.push(updates.hasLegalAuth ? 1 : 0);
  }
  if (updates.notes !== undefined) {
    setClauses.push('notes_enc = ?');
    values.push(updates.notes != null ? encrypt(String(updates.notes)) : null);
  }

  if (setClauses.length === 0) return getClientContact(id, clientId, tenantId);

  values.push(id, clientId, tenantId);
  await pool.query(
    `UPDATE client_contacts SET ${setClauses.join(', ')} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    values,
  );
  return getClientContact(id, clientId, tenantId);
}

/**
 * Deletes a client contact permanently.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteClientContact(id, clientId, tenantId) {
  await pool.query(
    'DELETE FROM client_contacts WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return { deleted: true };
}
