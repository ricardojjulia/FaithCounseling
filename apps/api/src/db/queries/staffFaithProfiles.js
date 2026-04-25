/**
 * Staff faith profile query helpers (singleton per staff member).
 *
 * Stores faith tradition, theological counseling approach, ordination status,
 * professional faith-body memberships (AACC, ACBC, CCCA), prayer and scripture
 * integration preferences, and spiritual gifts narrative.
 *
 * PHI columns: theological_approach_enc, other_faith_credentials_enc,
 * spiritual_gifts_enc (AES-256-GCM encrypted).
 *
 * Uses INSERT ... ON CONFLICT DO UPDATE keyed on uq_staff_faith to maintain
 * exactly one row per staff member.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToFaithProfile(row) {
  return {
    id:                    row.id,
    staffId:               row.staff_id,
    tenantId:              row.tenant_id,
    faithTradition:        row.faith_tradition,
    theologicalApproach:   row.theological_approach_enc != null ? decrypt(row.theological_approach_enc) : null,
    ordained:              Boolean(row.ordained),
    ordainingBody:         row.ordaining_body,
    aaccMember:            Boolean(row.aacc_member),
    acbcCertified:         Boolean(row.acbc_certified),
    cccaMember:            Boolean(row.ccca_member),
    otherFaithCredentials: row.other_faith_credentials_enc != null ? decrypt(row.other_faith_credentials_enc) : null,
    prayerIntegration:     row.prayer_integration,
    scriptureIntegration:  row.scripture_integration,
    spiritualGifts:        row.spiritual_gifts_enc != null ? decrypt(row.spiritual_gifts_enc) : null,
    updatedAt:             row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the faith profile for a staff member, or null if none exists.
 */
export async function getStaffFaithProfile(staffId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM staff_faith_profiles WHERE staff_id = ? AND tenant_id = ?',
    [staffId, tenantId],
  );
  return rows.length ? rowToFaithProfile(rows[0]) : null;
}

/**
 * Inserts or updates the faith profile singleton for a staff member.
 * Uses INSERT ... ON CONFLICT DO UPDATE keyed on uq_staff_faith.
 */
export async function upsertStaffFaithProfile({
  id,
  staffId,
  tenantId,
  faithTradition = null,
  theologicalApproach = null,
  ordained = false,
  ordainingBody = null,
  aaccMember = false,
  acbcCertified = false,
  cccaMember = false,
  otherFaithCredentials = null,
  prayerIntegration = null,
  scriptureIntegration = null,
  spiritualGifts = null,
}) {
  await pool.query(
    `INSERT INTO staff_faith_profiles
       (id, staff_id, tenant_id, faith_tradition, theological_approach_enc,
        ordained, ordaining_body, aacc_member, acbc_certified, ccca_member,
        other_faith_credentials_enc, prayer_integration, scripture_integration,
        spiritual_gifts_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT ON CONSTRAINT uq_staff_faith DO UPDATE SET
       tenant_id                   = EXCLUDED.tenant_id,
       faith_tradition             = EXCLUDED.faith_tradition,
       theological_approach_enc    = EXCLUDED.theological_approach_enc,
       ordained                    = EXCLUDED.ordained,
       ordaining_body              = EXCLUDED.ordaining_body,
       aacc_member                 = EXCLUDED.aacc_member,
       acbc_certified              = EXCLUDED.acbc_certified,
       ccca_member                 = EXCLUDED.ccca_member,
       other_faith_credentials_enc = EXCLUDED.other_faith_credentials_enc,
       prayer_integration          = EXCLUDED.prayer_integration,
       scripture_integration       = EXCLUDED.scripture_integration,
       spiritual_gifts_enc         = EXCLUDED.spiritual_gifts_enc`,
    [
      id, staffId, tenantId,
      faithTradition ?? null,
      theologicalApproach != null ? encrypt(String(theologicalApproach)) : null,
      ordained ? 1 : 0,
      ordainingBody ?? null,
      aaccMember ? 1 : 0,
      acbcCertified ? 1 : 0,
      cccaMember ? 1 : 0,
      otherFaithCredentials != null ? encrypt(String(otherFaithCredentials)) : null,
      prayerIntegration ?? null,
      scriptureIntegration ?? null,
      spiritualGifts != null ? encrypt(String(spiritualGifts)) : null,
    ],
  );
  return getStaffFaithProfile(staffId, tenantId);
}
