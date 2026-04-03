import pool from '../pool.js';
import { encryptJson, decryptJson, encrypt, decrypt } from '../../lib/encrypt.js';

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

function rowToFormCatalog(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    formKey: row.form_key,
    title: row.title,
    category: row.category,
    isStandardOnSignup: Boolean(row.is_standard_on_signup),
    isActive: Boolean(row.is_active),
    versionNumber: row.version_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToFormAssignment(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    formKey: row.form_key,
    formTitle: row.form_title,
    assignmentType: row.assignment_type,
    scheduledFor: row.scheduled_for,
    recurrenceRule: row.recurrence_rule,
    status: row.status,
    assignedBy: row.assigned_by,
    notes: row.notes,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToFormSubmission(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    assignmentId: row.assignment_id,
    clientId: row.client_id,
    formKey: row.form_key,
    formTitle: row.form_title,
    submissionVersion: row.submission_version,
    submittedByType: row.submitted_by_type,
    responses: decryptJson(row.responses_enc),
    scoreLabel: row.score_label,
    scoreValue: row.score_value === null || row.score_value === undefined ? null : Number(row.score_value),
    interpretationLabel: row.interpretation_label,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
  };
}

function rowToPortalRegistrationRequest(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    requestType: row.request_type ?? 'care_request',
    firstName: decrypt(row.first_name_enc),
    lastName: decrypt(row.last_name_enc),
    email: decrypt(row.email_enc),
    phone: row.phone_enc ? decrypt(row.phone_enc) : null,
    preferredContactMethod: row.preferred_contact_method ?? null,
    preferredContactWindow: row.preferred_contact_window ?? null,
    requestedServices: row.requested_services
      ? (typeof row.requested_services === 'string' ? JSON.parse(row.requested_services) : row.requested_services)
      : [],
    onboardingDetails: row.onboarding_details_enc ? (decryptJson(row.onboarding_details_enc) ?? {}) : {},
    notes: row.notes_enc ? decrypt(row.notes_enc) : null,
    status: row.status,
    convertedClientId: row.converted_client_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFormCatalog(tenantId, { includeInactive = false } = {}) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (!includeInactive) conditions.push('is_active = 1');
  const [rows] = await pool.query(
    `SELECT * FROM form_catalog WHERE ${conditions.join(' AND ')} ORDER BY category ASC, title ASC`,
    values,
  );
  return rows.map(rowToFormCatalog);
}

export async function createFormCatalogItem({
  id,
  tenantId,
  formKey,
  title,
  category,
  isStandardOnSignup,
  isActive,
  versionNumber,
}) {
  await pool.query(
    `INSERT INTO form_catalog
      (id, tenant_id, form_key, title, category, is_standard_on_signup, is_active, version_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, formKey, title, category, isStandardOnSignup ? 1 : 0, isActive ? 1 : 0, versionNumber],
  );
}

export async function updateFormCatalogItem(id, tenantId, fields) {
  const pairs = [];
  if (fields.title !== undefined) pairs.push(['title = ?', fields.title]);
  if (fields.category !== undefined) pairs.push(['category = ?', fields.category]);
  if (fields.isStandardOnSignup !== undefined) pairs.push(['is_standard_on_signup = ?', fields.isStandardOnSignup ? 1 : 0]);
  if (fields.isActive !== undefined) pairs.push(['is_active = ?', fields.isActive ? 1 : 0]);
  if (fields.versionNumber !== undefined) pairs.push(['version_number = ?', fields.versionNumber]);
  if (!pairs.length) return;
  const setSql = pairs.map(([sql]) => sql).join(', ');
  const values = pairs.map(([, value]) => value);
  await pool.query(`UPDATE form_catalog SET ${setSql} WHERE id = ? AND tenant_id = ?`, [...values, id, tenantId]);
}

export async function getFormCatalogItemByKey(tenantId, formKey) {
  const [rows] = await pool.query(
    'SELECT * FROM form_catalog WHERE tenant_id = ? AND form_key = ? LIMIT 1',
    [tenantId, formKey],
  );
  return rows[0] ? rowToFormCatalog(rows[0]) : null;
}

export async function listFormAssignments(tenantId, { clientId, status } = {}) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (clientId) {
    conditions.push('client_id = ?');
    values.push(clientId);
  }
  if (status) {
    conditions.push('status = ?');
    values.push(status);
  }
  const [rows] = await pool.query(
    `SELECT * FROM form_assignments WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    values,
  );
  return rows.map(rowToFormAssignment);
}

export async function createFormAssignment({
  id,
  tenantId,
  clientId,
  formKey,
  formTitle,
  assignmentType,
  scheduledFor,
  recurrenceRule,
  status,
  assignedBy,
  notes,
  dueAt,
}) {
  await pool.query(
    `INSERT INTO form_assignments
      (id, tenant_id, client_id, form_key, form_title, assignment_type, scheduled_for, recurrence_rule, status, assigned_by, notes, due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      formKey,
      formTitle,
      assignmentType,
      toSqlTimestamp(scheduledFor),
      recurrenceRule,
      status,
      assignedBy,
      notes,
      toSqlTimestamp(dueAt),
    ],
  );
}

export async function updateFormAssignment(id, tenantId, fields) {
  const pairs = [];
  if (fields.assignmentType !== undefined) pairs.push(['assignment_type = ?', fields.assignmentType]);
  if (fields.scheduledFor !== undefined) pairs.push(['scheduled_for = ?', toSqlTimestamp(fields.scheduledFor)]);
  if (fields.recurrenceRule !== undefined) pairs.push(['recurrence_rule = ?', fields.recurrenceRule]);
  if (fields.status !== undefined) pairs.push(['status = ?', fields.status]);
  if (fields.notes !== undefined) pairs.push(['notes = ?', fields.notes]);
  if (fields.dueAt !== undefined) pairs.push(['due_at = ?', toSqlTimestamp(fields.dueAt)]);
  if (fields.completedAt !== undefined) pairs.push(['completed_at = ?', toSqlTimestamp(fields.completedAt)]);
  if (!pairs.length) return;
  const setSql = pairs.map(([sql]) => sql).join(', ');
  const values = pairs.map(([, value]) => value);
  await pool.query(`UPDATE form_assignments SET ${setSql} WHERE id = ? AND tenant_id = ?`, [...values, id, tenantId]);
}

export async function getFormAssignmentById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM form_assignments WHERE id = ? AND tenant_id = ? LIMIT 1',
    [id, tenantId],
  );
  return rows[0] ? rowToFormAssignment(rows[0]) : null;
}

export async function getNextSubmissionVersion(tenantId, clientId, formKey) {
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(submission_version), 0) AS max_version
       FROM form_submissions
      WHERE tenant_id = ? AND client_id = ? AND form_key = ?`,
    [tenantId, clientId, formKey],
  );
  const maxVersion = rows[0]?.max_version ?? 0;
  return Number(maxVersion) + 1;
}

export async function listFormSubmissions(tenantId, { clientId, formKey } = {}) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (clientId) {
    conditions.push('client_id = ?');
    values.push(clientId);
  }
  if (formKey) {
    conditions.push('form_key = ?');
    values.push(formKey);
  }
  const [rows] = await pool.query(
    `SELECT * FROM form_submissions WHERE ${conditions.join(' AND ')} ORDER BY submitted_at DESC`,
    values,
  );
  return rows.map(rowToFormSubmission);
}

export async function createFormSubmission({
  id,
  tenantId,
  assignmentId,
  clientId,
  formKey,
  formTitle,
  submissionVersion,
  submittedByType,
  responses,
  scoreLabel,
  scoreValue,
  interpretationLabel,
  submittedAt,
}) {
  await pool.query(
    `INSERT INTO form_submissions
      (id, tenant_id, assignment_id, client_id, form_key, form_title, submission_version, submitted_by_type, responses_enc, score_label, score_value, interpretation_label, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      assignmentId,
      clientId,
      formKey,
      formTitle,
      submissionVersion,
      submittedByType,
      encryptJson(responses ?? {}),
      scoreLabel,
      scoreValue,
      interpretationLabel,
      toSqlTimestamp(submittedAt),
    ],
  );
}

export async function listPortalRegistrationRequests(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_registration_requests WHERE tenant_id = ? ORDER BY created_at DESC',
    [tenantId],
  );
  return rows.map(rowToPortalRegistrationRequest);
}

export async function createPortalRegistrationRequest({
  id,
  tenantId,
  requestType,
  firstName,
  lastName,
  email,
  phone,
  preferredContactMethod,
  preferredContactWindow,
  requestedServices,
  onboardingDetails,
  notes,
  status,
}) {
  await pool.query(
    `INSERT INTO portal_registration_requests
      (id, tenant_id, request_type, first_name_enc, last_name_enc, email_enc, phone_enc, preferred_contact_method, preferred_contact_window, requested_services, onboarding_details_enc, notes_enc, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      requestType,
      encrypt(firstName),
      encrypt(lastName),
      encrypt(email),
      phone ? encrypt(phone) : null,
      preferredContactMethod ?? null,
      preferredContactWindow ?? null,
      JSON.stringify(requestedServices ?? []),
      encryptJson(onboardingDetails ?? {}),
      notes ? encrypt(notes) : null,
      status,
    ],
  );
}

export async function updatePortalRegistrationRequest(id, tenantId, fields) {
  const pairs = [];
  if (fields.status !== undefined) pairs.push(['status = ?', fields.status]);
  if (fields.requestType !== undefined) pairs.push(['request_type = ?', fields.requestType]);
  if (fields.preferredContactMethod !== undefined) pairs.push(['preferred_contact_method = ?', fields.preferredContactMethod]);
  if (fields.preferredContactWindow !== undefined) pairs.push(['preferred_contact_window = ?', fields.preferredContactWindow]);
  if (fields.convertedClientId !== undefined) pairs.push(['converted_client_id = ?', fields.convertedClientId]);
  if (!pairs.length) return;
  const setSql = pairs.map(([sql]) => sql).join(', ');
  const values = pairs.map(([, value]) => value);
  await pool.query(`UPDATE portal_registration_requests SET ${setSql} WHERE id = ? AND tenant_id = ?`, [...values, id, tenantId]);
}
