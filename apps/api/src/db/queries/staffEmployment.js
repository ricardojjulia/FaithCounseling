/**
 * Staff employment query helpers (singleton per staff member).
 *
 * Stores employment type, status, hire/termination dates, NPI number,
 * malpractice insurance details, direct phone, and assigned locations.
 *
 * PHI columns: npi_number_enc, malpractice_policy_enc, direct_phone_enc
 * (AES-256-GCM encrypted).
 *
 * Uses INSERT ... ON CONFLICT DO UPDATE keyed on uq_employment_staff to
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

function rowToEmployment(row) {
  return {
    id:                  row.id,
    staffId:             row.staff_id,
    tenantId:            row.tenant_id,
    employmentType:      row.employment_type,
    employmentStatus:    row.employment_status,
    hireDate:            row.hire_date,
    terminationDate:     row.termination_date,
    npiNumber:           row.npi_number_enc != null ? decrypt(row.npi_number_enc) : null,
    malpracticeInsurer:  row.malpractice_insurer,
    malpracticePolicy:   row.malpractice_policy_enc != null ? decrypt(row.malpractice_policy_enc) : null,
    malpracticeExpiry:   row.malpractice_expiry,
    directPhone:         row.direct_phone_enc != null ? decrypt(row.direct_phone_enc) : null,
    locationIds:         parseJson(row.location_ids),
    updatedAt:           row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the employment record for a staff member, or null if none exists.
 */
export async function getStaffEmployment(staffId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM staff_employment WHERE staff_id = ? AND tenant_id = ?',
    [staffId, tenantId],
  );
  return rows.length ? rowToEmployment(rows[0]) : null;
}

/**
 * Inserts or updates the employment singleton for a staff member.
 * Uses INSERT ... ON CONFLICT DO UPDATE keyed on uq_employment_staff.
 */
export async function upsertStaffEmployment({
  id,
  staffId,
  tenantId,
  employmentType = 'full_time',
  employmentStatus = 'active',
  hireDate = null,
  terminationDate = null,
  npiNumber = null,
  malpracticeInsurer = null,
  malpracticePolicy = null,
  malpracticeExpiry = null,
  directPhone = null,
  locationIds = [],
}) {
  await pool.query(
    `INSERT INTO staff_employment
       (id, staff_id, tenant_id, employment_type, employment_status,
        hire_date, termination_date, npi_number_enc, malpractice_insurer,
        malpractice_policy_enc, malpractice_expiry, direct_phone_enc, location_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT ON CONSTRAINT uq_employment_staff DO UPDATE SET
       tenant_id              = EXCLUDED.tenant_id,
       employment_type        = EXCLUDED.employment_type,
       employment_status      = EXCLUDED.employment_status,
       hire_date              = EXCLUDED.hire_date,
       termination_date       = EXCLUDED.termination_date,
       npi_number_enc         = EXCLUDED.npi_number_enc,
       malpractice_insurer    = EXCLUDED.malpractice_insurer,
       malpractice_policy_enc = EXCLUDED.malpractice_policy_enc,
       malpractice_expiry     = EXCLUDED.malpractice_expiry,
       direct_phone_enc       = EXCLUDED.direct_phone_enc,
       location_ids           = EXCLUDED.location_ids`,
    [
      id, staffId, tenantId, employmentType, employmentStatus,
      hireDate ?? null,
      terminationDate ?? null,
      npiNumber != null ? encrypt(String(npiNumber)) : null,
      malpracticeInsurer ?? null,
      malpracticePolicy != null ? encrypt(String(malpracticePolicy)) : null,
      malpracticeExpiry ?? null,
      directPhone != null ? encrypt(String(directPhone)) : null,
      JSON.stringify(Array.isArray(locationIds) ? locationIds : []),
    ],
  );
  return getStaffEmployment(staffId, tenantId);
}
