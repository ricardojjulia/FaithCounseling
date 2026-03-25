/**
 * Client insurance query helpers.
 *
 * PHI columns (carrier_name_enc, member_id_enc, group_number_enc,
 * subscriber_name_enc, subscriber_dob_enc, auth_number_enc,
 * referral_number_enc) are encrypted at write time and decrypted at read
 * time using AES-256-GCM helpers in lib/encrypt.js.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientInsurance(row) {
  return {
    id:                  row.id,
    tenantId:            row.tenant_id,
    clientId:            row.client_id,
    coverageOrder:       row.coverage_order,
    carrierName:         decrypt(row.carrier_name_enc),
    planName:            row.plan_name ?? null,
    memberId:            decrypt(row.member_id_enc),
    groupNumber:         row.group_number_enc != null ? decrypt(row.group_number_enc) : null,
    subscriberName:      row.subscriber_name_enc != null ? decrypt(row.subscriber_name_enc) : null,
    subscriberDob:       row.subscriber_dob_enc != null ? decrypt(row.subscriber_dob_enc) : null,
    subscriberRel:       row.subscriber_rel ?? null,
    authNumber:          row.auth_number_enc != null ? decrypt(row.auth_number_enc) : null,
    authVisitsApproved:  row.auth_visits_approved ?? null,
    authExpiresOn:       row.auth_expires_on ?? null,
    referralNumber:      row.referral_number_enc != null ? decrypt(row.referral_number_enc) : null,
    copayCents:          row.copay_cents ?? null,
    effectiveFrom:       row.effective_from ?? null,
    effectiveTo:         row.effective_to ?? null,
    isActive:            Boolean(row.is_active),
    verifiedOn:          row.verified_on ?? null,
    verifiedBy:          row.verified_by ?? null,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all insurance records for a client (decrypted).
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listClientInsurance(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_insurance WHERE client_id = ? AND tenant_id = ? ORDER BY is_active DESC, coverage_order ASC',
    [clientId, tenantId],
  );
  return rows.map(rowToClientInsurance);
}

/**
 * Returns a single insurance record or null.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientInsurance(id, clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_insurance WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToClientInsurance(rows[0]) : null;
}

/**
 * Inserts a new insurance record and returns the created object.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   coverageOrder?: string, carrierName: string, planName?: string,
 *   memberId: string, groupNumber?: string,
 *   subscriberName?: string, subscriberDob?: string, subscriberRel?: string,
 *   authNumber?: string, authVisitsApproved?: number, authExpiresOn?: string,
 *   referralNumber?: string, copayCents?: number,
 *   effectiveFrom?: string, effectiveTo?: string, isActive?: boolean,
 *   verifiedOn?: string, verifiedBy?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createClientInsurance({
  id,
  tenantId,
  clientId,
  coverageOrder = 'primary',
  carrierName,
  planName = null,
  memberId,
  groupNumber = null,
  subscriberName = null,
  subscriberDob = null,
  subscriberRel = null,
  authNumber = null,
  authVisitsApproved = null,
  authExpiresOn = null,
  referralNumber = null,
  copayCents = null,
  effectiveFrom = null,
  effectiveTo = null,
  isActive = true,
  verifiedOn = null,
  verifiedBy = null,
}) {
  await pool.query(
    `INSERT INTO client_insurance
       (id, tenant_id, client_id, coverage_order, carrier_name_enc, plan_name,
        member_id_enc, group_number_enc, subscriber_name_enc, subscriber_dob_enc,
        subscriber_rel, auth_number_enc, auth_visits_approved, auth_expires_on,
        referral_number_enc, copay_cents, effective_from, effective_to,
        is_active, verified_on, verified_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      coverageOrder,
      encrypt(String(carrierName)),
      planName ?? null,
      encrypt(String(memberId)),
      groupNumber != null ? encrypt(String(groupNumber)) : null,
      subscriberName != null ? encrypt(String(subscriberName)) : null,
      subscriberDob != null ? encrypt(String(subscriberDob)) : null,
      subscriberRel ?? null,
      authNumber != null ? encrypt(String(authNumber)) : null,
      authVisitsApproved ?? null,
      authExpiresOn ?? null,
      referralNumber != null ? encrypt(String(referralNumber)) : null,
      copayCents ?? null,
      effectiveFrom ?? null,
      effectiveTo ?? null,
      isActive ? 1 : 0,
      verifiedOn ?? null,
      verifiedBy ?? null,
    ],
  );
  return getClientInsurance(id, clientId, tenantId);
}

/**
 * Updates the given fields on an insurance record and returns the updated object.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @param {Partial<object>} updates  camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateClientInsurance(id, clientId, tenantId, updates) {
  const setClauses = [];
  const values = [];

  if (updates.coverageOrder !== undefined) {
    setClauses.push('coverage_order = ?');
    values.push(updates.coverageOrder);
  }
  if (updates.carrierName !== undefined) {
    setClauses.push('carrier_name_enc = ?');
    values.push(updates.carrierName != null ? encrypt(String(updates.carrierName)) : null);
  }
  if (updates.planName !== undefined) {
    setClauses.push('plan_name = ?');
    values.push(updates.planName ?? null);
  }
  if (updates.memberId !== undefined) {
    setClauses.push('member_id_enc = ?');
    values.push(updates.memberId != null ? encrypt(String(updates.memberId)) : null);
  }
  if (updates.groupNumber !== undefined) {
    setClauses.push('group_number_enc = ?');
    values.push(updates.groupNumber != null ? encrypt(String(updates.groupNumber)) : null);
  }
  if (updates.subscriberName !== undefined) {
    setClauses.push('subscriber_name_enc = ?');
    values.push(updates.subscriberName != null ? encrypt(String(updates.subscriberName)) : null);
  }
  if (updates.subscriberDob !== undefined) {
    setClauses.push('subscriber_dob_enc = ?');
    values.push(updates.subscriberDob != null ? encrypt(String(updates.subscriberDob)) : null);
  }
  if (updates.subscriberRel !== undefined) {
    setClauses.push('subscriber_rel = ?');
    values.push(updates.subscriberRel ?? null);
  }
  if (updates.authNumber !== undefined) {
    setClauses.push('auth_number_enc = ?');
    values.push(updates.authNumber != null ? encrypt(String(updates.authNumber)) : null);
  }
  if (updates.authVisitsApproved !== undefined) {
    setClauses.push('auth_visits_approved = ?');
    values.push(updates.authVisitsApproved ?? null);
  }
  if (updates.authExpiresOn !== undefined) {
    setClauses.push('auth_expires_on = ?');
    values.push(updates.authExpiresOn ?? null);
  }
  if (updates.referralNumber !== undefined) {
    setClauses.push('referral_number_enc = ?');
    values.push(updates.referralNumber != null ? encrypt(String(updates.referralNumber)) : null);
  }
  if (updates.copayCents !== undefined) {
    setClauses.push('copay_cents = ?');
    values.push(updates.copayCents ?? null);
  }
  if (updates.effectiveFrom !== undefined) {
    setClauses.push('effective_from = ?');
    values.push(updates.effectiveFrom ?? null);
  }
  if (updates.effectiveTo !== undefined) {
    setClauses.push('effective_to = ?');
    values.push(updates.effectiveTo ?? null);
  }
  if (updates.isActive !== undefined) {
    setClauses.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.verifiedOn !== undefined) {
    setClauses.push('verified_on = ?');
    values.push(updates.verifiedOn ?? null);
  }
  if (updates.verifiedBy !== undefined) {
    setClauses.push('verified_by = ?');
    values.push(updates.verifiedBy ?? null);
  }

  if (setClauses.length === 0) return getClientInsurance(id, clientId, tenantId);

  values.push(id, clientId, tenantId);
  await pool.query(
    `UPDATE client_insurance SET ${setClauses.join(', ')} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    values,
  );
  return getClientInsurance(id, clientId, tenantId);
}

/**
 * Deletes an insurance record permanently.
 * @param {string} id
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteClientInsurance(id, clientId, tenantId) {
  await pool.query(
    'DELETE FROM client_insurance WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return { deleted: true };
}
