/**
 * Client faith profile query helpers (singleton per client).
 *
 * PHI columns (church_name_enc, pastor_name_enc, spiritual_director_enc,
 * spiritual_concerns_enc, religious_restrictions_enc, faith_strengths_enc)
 * are encrypted at write time and decrypted at read time using AES-256-GCM
 * helpers in lib/encrypt.js.
 *
 * The upsert function uses INSERT ... ON DUPLICATE KEY UPDATE to maintain
 * a single row per client enforced by the UNIQUE KEY uq_cfaith_client.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientFaithProfile(row) {
  return {
    id:                      row.id,
    tenantId:                row.tenant_id,
    clientId:                row.client_id,
    denomination:            row.denomination ?? null,
    churchName:              row.church_name_enc != null ? decrypt(row.church_name_enc) : null,
    pastorName:              row.pastor_name_enc != null ? decrypt(row.pastor_name_enc) : null,
    spiritualDirector:       row.spiritual_director_enc != null ? decrypt(row.spiritual_director_enc) : null,
    faithIntegrationLevel:   row.faith_integration_level,
    spiritualConcerns:       row.spiritual_concerns_enc != null ? decrypt(row.spiritual_concerns_enc) : null,
    religiousRestrictions:   row.religious_restrictions_enc != null ? decrypt(row.religious_restrictions_enc) : null,
    faithStrengths:          row.faith_strengths_enc != null ? decrypt(row.faith_strengths_enc) : null,
    createdAt:               row.created_at,
    updatedAt:               row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the faith profile for a client, or null if none exists.
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientFaithProfile(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_faith_profiles WHERE client_id = ? AND tenant_id = ?',
    [clientId, tenantId],
  );
  return rows.length ? rowToClientFaithProfile(rows[0]) : null;
}

/**
 * Inserts or updates the faith profile singleton for a client.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE keyed on the UNIQUE (client_id) constraint.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   denomination?: string, churchName?: string, pastorName?: string,
 *   spiritualDirector?: string, faithIntegrationLevel?: string,
 *   spiritualConcerns?: string, religiousRestrictions?: string,
 *   faithStrengths?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function upsertClientFaithProfile({
  id,
  tenantId,
  clientId,
  denomination = null,
  churchName = null,
  pastorName = null,
  spiritualDirector = null,
  faithIntegrationLevel = 'open',
  spiritualConcerns = null,
  religiousRestrictions = null,
  faithStrengths = null,
}) {
  const churchNameEnc            = churchName != null ? encrypt(String(churchName)) : null;
  const pastorNameEnc            = pastorName != null ? encrypt(String(pastorName)) : null;
  const spiritualDirectorEnc     = spiritualDirector != null ? encrypt(String(spiritualDirector)) : null;
  const spiritualConcernsEnc     = spiritualConcerns != null ? encrypt(String(spiritualConcerns)) : null;
  const religiousRestrictionsEnc = religiousRestrictions != null ? encrypt(String(religiousRestrictions)) : null;
  const faithStrengthsEnc        = faithStrengths != null ? encrypt(String(faithStrengths)) : null;

  await pool.query(
    `INSERT INTO client_faith_profiles
       (id, tenant_id, client_id, denomination, church_name_enc, pastor_name_enc,
        spiritual_director_enc, faith_integration_level, spiritual_concerns_enc,
        religious_restrictions_enc, faith_strengths_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tenant_id = VALUES(tenant_id),
       denomination = VALUES(denomination),
       church_name_enc = VALUES(church_name_enc),
       pastor_name_enc = VALUES(pastor_name_enc),
       spiritual_director_enc = VALUES(spiritual_director_enc),
       faith_integration_level = VALUES(faith_integration_level),
       spiritual_concerns_enc = VALUES(spiritual_concerns_enc),
       religious_restrictions_enc = VALUES(religious_restrictions_enc),
       faith_strengths_enc = VALUES(faith_strengths_enc)`,
    [
      id,
      tenantId,
      clientId,
      denomination ?? null,
      churchNameEnc,
      pastorNameEnc,
      spiritualDirectorEnc,
      faithIntegrationLevel,
      spiritualConcernsEnc,
      religiousRestrictionsEnc,
      faithStrengthsEnc,
    ],
  );
  return getClientFaithProfile(clientId, tenantId);
}
