import pool from '../pool.js';
import { randomUUID } from 'node:crypto';
import { decrypt, encrypt } from '../../lib/encrypt.js';

function toSqlTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToTenantProvisioningRequest(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    requestedTenantId: row.requested_tenant_id,
    requestedPracticeName: row.requested_practice_name,
    ownerEmail: row.owner_email_enc ? decrypt(row.owner_email_enc) : row.owner_email,
    status: row.status,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
  };
}

function rowToImpersonationSession(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    requestedBy: row.requested_by,
    targetTenantId: row.target_tenant_id,
    targetRole: row.target_role,
    reason: row.reason,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
  };
}

function rowToDataExportJob(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    exportType: row.export_type,
    status: row.status,
    requestedByRole: row.requested_by_role,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    format: row.format,
  };
}

function rowToRetentionPolicy(row) {
  return {
    tenantId: row.tenant_id,
    clinicalRecordsSchedule: row.clinical_records_schedule,
    billingSchedule: row.billing_schedule,
    auditLogSchedule: row.audit_log_schedule,
    includeDocumentVersions: Boolean(row.include_document_versions),
    legalHoldEnabled: Boolean(row.legal_hold_enabled),
  };
}

// ---------------------------------------------------------------------------
// Tenant Provisioning Requests
// ---------------------------------------------------------------------------

export async function listTenantProvisioningRequests(tenantId) {
  if (tenantId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM tenant_provisioning WHERE tenant_id = ?',
      [tenantId]
    );
    return rows.map(rowToTenantProvisioningRequest);
  }
  const [rows] = await pool.query('SELECT * FROM tenant_provisioning');
  return rows.map(rowToTenantProvisioningRequest);
}

export async function createTenantProvisioningRequest({
  id,
  tenantId,
  requestedTenantId,
  requestedPracticeName,
  ownerEmail,
  status,
}) {
  await pool.query(
    `INSERT INTO tenant_provisioning
       (id, tenant_id, requested_tenant_id, requested_practice_name, owner_email, owner_email_enc, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, requestedTenantId, requestedPracticeName, null, encrypt(ownerEmail), status]
  );
  const [rows] = await pool.query(
    'SELECT * FROM tenant_provisioning WHERE id = ?',
    [id]
  );
  return rowToTenantProvisioningRequest(rows[0]);
}

export async function updateTenantProvisioningRequest(id, fields) {
  const setClauses = [];
  const values = [];

  if (fields.requestedTenantId !== undefined) { setClauses.push('requested_tenant_id = ?'); values.push(fields.requestedTenantId); }
  if (fields.requestedPracticeName !== undefined) { setClauses.push('requested_practice_name = ?'); values.push(fields.requestedPracticeName); }
  if (fields.ownerEmail !== undefined) {
    setClauses.push('owner_email = ?');
    values.push(null);
    setClauses.push('owner_email_enc = ?');
    values.push(encrypt(fields.ownerEmail));
  }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.tenantId !== undefined) { setClauses.push('tenant_id = ?'); values.push(fields.tenantId); }
  if (fields.requestedAt !== undefined) { setClauses.push('requested_at = ?'); values.push(toSqlTimestamp(fields.requestedAt)); }
  if (fields.completedAt !== undefined) { setClauses.push('completed_at = ?'); values.push(toSqlTimestamp(fields.completedAt)); }

  if (setClauses.length > 0) {
    values.push(id);
    await pool.query(
      `UPDATE tenant_provisioning SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM tenant_provisioning WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return rowToTenantProvisioningRequest(rows[0]);
}

// ---------------------------------------------------------------------------
// Impersonation Sessions
// ---------------------------------------------------------------------------

export async function listImpersonationSessions(tenantId) {
  if (tenantId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM impersonation_sessions WHERE target_tenant_id = ?',
      [tenantId]
    );
    return rows.map(rowToImpersonationSession);
  }
  const [rows] = await pool.query('SELECT * FROM impersonation_sessions');
  return rows.map(rowToImpersonationSession);
}

export async function createImpersonationSession({
  id,
  tenantId,
  targetTenantId,
  targetRole,
  requestedBy,
  reason,
  startedAt,
  status,
}) {
  const startedAtSql = toSqlTimestamp(startedAt);
  await pool.query(
    `INSERT INTO impersonation_sessions
       (id, tenant_id, target_tenant_id, target_role, requested_by, reason, started_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, targetTenantId, targetRole, requestedBy, reason, startedAtSql, status]
  );
  const [rows] = await pool.query(
    'SELECT * FROM impersonation_sessions WHERE id = ?',
    [id]
  );
  return rowToImpersonationSession(rows[0]);
}

export async function endImpersonationSession(id) {
  await pool.query(
    `UPDATE impersonation_sessions SET status = 'ended', ended_at = NOW() WHERE id = ?`,
    [id]
  );
  const [rows] = await pool.query(
    'SELECT * FROM impersonation_sessions WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return rowToImpersonationSession(rows[0]);
}

// ---------------------------------------------------------------------------
// Data Export Jobs
// ---------------------------------------------------------------------------

export async function listDataExportJobs(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM data_export_jobs WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToDataExportJob);
}

export async function createDataExportJob({
  id,
  tenantId,
  exportType,
  status,
  requestedByRole,
  requestedAt,
  completedAt,
  format,
}) {
  const requestedAtSql = toSqlTimestamp(requestedAt);
  const completedAtSql = toSqlTimestamp(completedAt);
  await pool.query(
    `INSERT INTO data_export_jobs
       (id, tenant_id, export_type, status, requested_by_role, requested_at, completed_at, format)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, exportType, status, requestedByRole, requestedAtSql, completedAtSql, format ?? 'json']
  );
  const [rows] = await pool.query(
    'SELECT * FROM data_export_jobs WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToDataExportJob(rows[0]);
}

export async function updateDataExportJob(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.exportType !== undefined) { setClauses.push('export_type = ?'); values.push(fields.exportType); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.requestedByRole !== undefined) { setClauses.push('requested_by_role = ?'); values.push(fields.requestedByRole); }
  if (fields.requestedAt !== undefined) { setClauses.push('requested_at = ?'); values.push(toSqlTimestamp(fields.requestedAt)); }
  if (fields.completedAt !== undefined) { setClauses.push('completed_at = ?'); values.push(toSqlTimestamp(fields.completedAt)); }
  if (fields.format !== undefined) { setClauses.push('format = ?'); values.push(fields.format); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE data_export_jobs SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM data_export_jobs WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToDataExportJob(rows[0]);
}

// ---------------------------------------------------------------------------
// Retention Policies
// ---------------------------------------------------------------------------

export async function getRetentionPolicy(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM retention_policies WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1',
    [tenantId]
  );
  if (rows.length === 0) return null;
  return rowToRetentionPolicy(rows[0]);
}

export async function upsertRetentionPolicy(tenantId, policy) {
  const existing = await getRetentionPolicy(tenantId);
  if (existing) {
    await pool.query(
      `UPDATE retention_policies
       SET clinical_records_schedule = ?,
           billing_schedule = ?,
           audit_log_schedule = ?,
           include_document_versions = ?,
           legal_hold_enabled = ?
       WHERE tenant_id = ?`,
      [
        policy.clinicalRecordsSchedule,
        policy.billingSchedule,
        policy.auditLogSchedule,
        policy.includeDocumentVersions ? 1 : 0,
        policy.legalHoldEnabled ? 1 : 0,
        tenantId,
      ],
    );
  } else {
    await pool.query(
      `INSERT INTO retention_policies
         (id, tenant_id, clinical_records_schedule, billing_schedule, audit_log_schedule,
          include_document_versions, legal_hold_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        `rtp-${randomUUID()}`,
        tenantId,
        policy.clinicalRecordsSchedule,
        policy.billingSchedule,
        policy.auditLogSchedule,
        policy.includeDocumentVersions ? 1 : 0,
        policy.legalHoldEnabled ? 1 : 0,
      ],
    );
  }
  return getRetentionPolicy(tenantId);
}
