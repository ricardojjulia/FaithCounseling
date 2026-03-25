/**
 * Client legal / guardianship query helpers (singleton per client).
 *
 * PHI columns: guardian_name_enc, guardian_phone_enc, guardian_email_enc,
 * court_case_number_enc, custody_notes_enc use encrypt/decrypt.
 * guardian_address_enc and court_contact_enc store JSON objects and use
 * encryptJson/decryptJson.
 *
 * The upsert function uses INSERT ... ON DUPLICATE KEY UPDATE to maintain
 * a single row per client enforced by the UNIQUE KEY uq_clegal_client.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt, encryptJson, decryptJson } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientLegal(row) {
  return {
    id:                   row.id,
    tenantId:             row.tenant_id,
    clientId:             row.client_id,
    guardianName:         row.guardian_name_enc != null ? decrypt(row.guardian_name_enc) : null,
    guardianRelationship: row.guardian_relationship ?? null,
    guardianPhone:        row.guardian_phone_enc != null ? decrypt(row.guardian_phone_enc) : null,
    guardianEmail:        row.guardian_email_enc != null ? decrypt(row.guardian_email_enc) : null,
    guardianAddress:      row.guardian_address_enc != null ? decryptJson(row.guardian_address_enc) : null,
    courtOrdered:         Boolean(row.court_ordered),
    courtCaseNumber:      row.court_case_number_enc != null ? decrypt(row.court_case_number_enc) : null,
    courtContact:         row.court_contact_enc != null ? decryptJson(row.court_contact_enc) : null,
    courtOrderExpires:    row.court_order_expires ?? null,
    custodyNotes:         row.custody_notes_enc != null ? decrypt(row.custody_notes_enc) : null,
    createdAt:            row.created_at,
    updatedAt:            row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the legal record for a client, or null if none exists.
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientLegal(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_legal WHERE client_id = ? AND tenant_id = ?',
    [clientId, tenantId],
  );
  return rows.length ? rowToClientLegal(rows[0]) : null;
}

/**
 * Inserts or updates the legal singleton for a client.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE keyed on the UNIQUE (client_id) constraint.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   guardianName?: string, guardianRelationship?: string,
 *   guardianPhone?: string, guardianEmail?: string, guardianAddress?: object,
 *   courtOrdered?: boolean, courtCaseNumber?: string,
 *   courtContact?: object, courtOrderExpires?: string, custodyNotes?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function upsertClientLegal({
  id,
  tenantId,
  clientId,
  guardianName = null,
  guardianRelationship = null,
  guardianPhone = null,
  guardianEmail = null,
  guardianAddress = null,
  courtOrdered = false,
  courtCaseNumber = null,
  courtContact = null,
  courtOrderExpires = null,
  custodyNotes = null,
}) {
  const guardianNameEnc     = guardianName != null ? encrypt(String(guardianName)) : null;
  const guardianPhoneEnc    = guardianPhone != null ? encrypt(String(guardianPhone)) : null;
  const guardianEmailEnc    = guardianEmail != null ? encrypt(String(guardianEmail)) : null;
  const guardianAddressEnc  = guardianAddress != null ? encryptJson(guardianAddress) : null;
  const courtCaseNumberEnc  = courtCaseNumber != null ? encrypt(String(courtCaseNumber)) : null;
  const courtContactEnc     = courtContact != null ? encryptJson(courtContact) : null;
  const custodyNotesEnc     = custodyNotes != null ? encrypt(String(custodyNotes)) : null;

  await pool.query(
    `INSERT INTO client_legal
       (id, tenant_id, client_id, guardian_name_enc, guardian_relationship,
        guardian_phone_enc, guardian_email_enc, guardian_address_enc,
        court_ordered, court_case_number_enc, court_contact_enc,
        court_order_expires, custody_notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tenant_id = VALUES(tenant_id),
       guardian_name_enc = VALUES(guardian_name_enc),
       guardian_relationship = VALUES(guardian_relationship),
       guardian_phone_enc = VALUES(guardian_phone_enc),
       guardian_email_enc = VALUES(guardian_email_enc),
       guardian_address_enc = VALUES(guardian_address_enc),
       court_ordered = VALUES(court_ordered),
       court_case_number_enc = VALUES(court_case_number_enc),
       court_contact_enc = VALUES(court_contact_enc),
       court_order_expires = VALUES(court_order_expires),
       custody_notes_enc = VALUES(custody_notes_enc)`,
    [
      id,
      tenantId,
      clientId,
      guardianNameEnc,
      guardianRelationship ?? null,
      guardianPhoneEnc,
      guardianEmailEnc,
      guardianAddressEnc,
      courtOrdered ? 1 : 0,
      courtCaseNumberEnc,
      courtContactEnc,
      courtOrderExpires ?? null,
      custodyNotesEnc,
    ],
  );
  return getClientLegal(clientId, tenantId);
}
