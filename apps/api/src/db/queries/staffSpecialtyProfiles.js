/**
 * Staff specialty profile query helpers (singleton per staff member).
 *
 * Stores clinical specialties, therapeutic modalities, age groups served,
 * languages spoken, max caseload, and notes.
 *
 * JSON columns (specialties, modalities, age_groups_served, languages) are
 * serialised with JSON.stringify on write and parsed on read.
 *
 * PHI column: notes_enc (AES-256-GCM encrypted).
 *
 * Uses INSERT ... ON CONFLICT DO UPDATE keyed on uq_specialty_staff to
 * maintain exactly one row per staff member.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function parseJson(val, fallback = []) {
  if (val == null) return fallback;
  if (typeof val === 'string') return JSON.parse(val);
  return val;
}

function rowToSpecialtyProfile(row) {
  return {
    id:              row.id,
    staffId:         row.staff_id,
    tenantId:        row.tenant_id,
    specialties:     parseJson(row.specialties),
    modalities:      parseJson(row.modalities),
    ageGroupsServed: parseJson(row.age_groups_served),
    languages:       parseJson(row.languages),
    maxCaseload:     row.max_caseload != null ? Number(row.max_caseload) : null,
    notes:           row.notes_enc != null ? decrypt(row.notes_enc) : null,
    updatedAt:       row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the specialty profile for a staff member, or null if none exists.
 */
export async function getStaffSpecialtyProfile(staffId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM staff_specialty_profiles WHERE staff_id = ? AND tenant_id = ?',
    [staffId, tenantId],
  );
  return rows.length ? rowToSpecialtyProfile(rows[0]) : null;
}

/**
 * Inserts or updates the specialty profile singleton for a staff member.
 * Uses INSERT ... ON CONFLICT DO UPDATE keyed on uq_specialty_staff.
 */
export async function upsertStaffSpecialtyProfile({
  id,
  staffId,
  tenantId,
  specialties = [],
  modalities = [],
  ageGroupsServed = [],
  languages = [],
  maxCaseload = null,
  notes = null,
}) {
  await pool.query(
    `INSERT INTO staff_specialty_profiles
       (id, staff_id, tenant_id, specialties, modalities,
        age_groups_served, languages, max_caseload, notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT ON CONSTRAINT uq_specialty_staff DO UPDATE SET
       tenant_id        = EXCLUDED.tenant_id,
       specialties      = EXCLUDED.specialties,
       modalities       = EXCLUDED.modalities,
       age_groups_served = EXCLUDED.age_groups_served,
       languages        = EXCLUDED.languages,
       max_caseload     = EXCLUDED.max_caseload,
       notes_enc        = EXCLUDED.notes_enc`,
    [
      id, staffId, tenantId,
      JSON.stringify(Array.isArray(specialties) ? specialties : []),
      JSON.stringify(Array.isArray(modalities) ? modalities : []),
      JSON.stringify(Array.isArray(ageGroupsServed) ? ageGroupsServed : []),
      JSON.stringify(Array.isArray(languages) ? languages : []),
      maxCaseload ?? null,
      notes != null ? encrypt(String(notes)) : null,
    ],
  );
  return getStaffSpecialtyProfile(staffId, tenantId);
}
