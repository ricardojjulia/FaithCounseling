import pool from '../pool.js';
import { encrypt, decrypt, encryptJson, decryptJson, deriveLookupHash } from '../../lib/encrypt.js';

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

function rowToPortalAccount(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    tenantId: row.tenant_id,
    email: decrypt(row.email_enc),
    status: row.status,
    mfaEnabled: Boolean(row.mfa_enabled),
    lastLoginAt: row.last_login ?? null,
    invitedAt: row.created_at ?? null,
  };
}

function rowToPortalClientProfile(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    preferredName: row.preferred_name_enc ? decrypt(row.preferred_name_enc) : '',
    contactEmail: row.contact_email_enc ? decrypt(row.contact_email_enc) : '',
    contactPhone: row.contact_phone_enc ? decrypt(row.contact_phone_enc) : '',
    contactPreferences: row.contact_preferences_enc ? (decryptJson(row.contact_preferences_enc) ?? {}) : {},
    profileDetails: row.profile_details_enc ? (decryptJson(row.profile_details_enc) ?? {}) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPortalResource(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    content: row.content,
    resourceType: row.resource_type,
    audience: row.audience,
    publishedAt: row.published_at,
  };
}

function rowToPortalUpload(row, { includeContent = false } = {}) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    category: row.category,
    fileName: decrypt(row.file_name_enc),
    mimeType: row.mime_type ?? 'application/octet-stream',
    sizeBytes: Number(row.size_bytes) || 0,
    notes: row.notes_enc ? decrypt(row.notes_enc) : '',
    uploadedByRole: row.uploaded_by_role ?? 'client',
    status: row.status ?? 'uploaded',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(includeContent && row.content_enc ? { contentBase64: decrypt(row.content_enc) } : {}),
  };
}

function rowToPortalDataRightRequest(row) {
  const policySnapshot = row.policy_snapshot
    ? (typeof row.policy_snapshot === 'string' ? JSON.parse(row.policy_snapshot) : row.policy_snapshot)
    : null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    requestType: row.request_type,
    status: row.status,
    deliveryFormat: row.delivery_format ?? 'json',
    reasonCode: row.reason_code ?? 'self_service_request',
    notes: row.notes_enc ? decrypt(row.notes_enc) : '',
    policySnapshot,
    requestedAt: row.requested_at ?? row.created_at,
    resolvedAt: row.resolved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPortalMessageThread(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPortalMessage(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderType: row.sender_role,
    senderRole: row.sender_role,
    content: decrypt(row.content_enc),
    sentAt: row.sent_at,
  };
}

function rowToPortalAppointmentRequest(row) {
  const preferredTimes = typeof row.preferred_times === 'string'
    ? JSON.parse(row.preferred_times)
    : row.preferred_times;
  const first = Array.isArray(preferredTimes) ? preferredTimes[0] : null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    requestedType: row.requested_type,
    preferredTimes,
    preferredStartAt: first?.startAt ?? null,
    preferredEndAt: first?.endAt ?? null,
    mode: first?.mode ?? 'remote',
    notes: row.notes,
    status: row.status,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToPortalSettings(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    practiceName: row.practice_name,
    logoUrl: row.logo_url ?? '',
    brandColor: row.brand_color ?? '#1f7a8c',
    accentColor: row.accent_color ?? '#f0f7f8',
    welcomeHeadline: row.welcome_headline,
    welcomeMessage: row.welcome_message,
    helpMessage: row.help_message ?? '',
    supportEmail: row.support_email_enc ? decrypt(row.support_email_enc) : '',
    registrationMode: row.registration_mode,
    allowCreateAccount: Boolean(row.allow_create_account),
    allowCareRequests: Boolean(row.allow_care_requests),
    allowSchedulingRequests: Boolean(row.allow_scheduling_requests),
    showPublicCounselorDirectory: Boolean(row.show_public_counselor_directory),
    financialMode: row.financial_mode ?? 'offerings',
    suggestedOfferingCents: Number(row.suggested_offering_cents ?? 0),
    offeringMinistryNote: row.offering_ministry_note ?? '',
    contactPreferenceOptions: parseJsonArray(row.contact_preference_options),
    defaultSignupFormKeys: parseJsonArray(row.default_signup_form_keys),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Portal Accounts
// ---------------------------------------------------------------------------

export async function getPortalAccount(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_accounts WHERE client_id = ? AND tenant_id = ?',
    [clientId, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToPortalAccount(rows[0]);
}

export async function createPortalAccount({ id, clientId, tenantId, email, passwordHash = null, status, mfaEnabled }) {
  await pool.query(
    `INSERT INTO portal_accounts
       (id, client_id, tenant_id, email_enc, email_lookup_hash, password_hash, status, mfa_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      clientId,
      tenantId,
      encrypt(email),
      deriveLookupHash(email, { lowercase: true }),
      passwordHash,
      status,
      mfaEnabled ? 1 : 0,
    ]
  );
  return getPortalAccount(clientId, tenantId);
}

export async function updatePortalAccount(clientId, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.email !== undefined) { setClauses.push('email_enc = ?'); values.push(encrypt(fields.email)); }
  if (fields.email !== undefined) { setClauses.push('email_lookup_hash = ?'); values.push(deriveLookupHash(fields.email, { lowercase: true })); }
  if (fields.passwordHash !== undefined) { setClauses.push('password_hash = ?'); values.push(fields.passwordHash); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.mfaEnabled !== undefined) { setClauses.push('mfa_enabled = ?'); values.push(fields.mfaEnabled ? 1 : 0); }
  if (fields.failedAttempts !== undefined) { setClauses.push('failed_attempts = ?'); values.push(fields.failedAttempts); }
  if (fields.lockedUntil !== undefined) { setClauses.push('locked_until = ?'); values.push(fields.lockedUntil); }
  if (fields.lastLoginAt !== undefined) { setClauses.push('last_login = ?'); values.push(fields.lastLoginAt); }

  if (setClauses.length === 0) return getPortalAccount(clientId, tenantId);

  values.push(clientId, tenantId);
  await pool.query(
    `UPDATE portal_accounts SET ${setClauses.join(', ')} WHERE client_id = ? AND tenant_id = ?`,
    values
  );
  return getPortalAccount(clientId, tenantId);
}

// ---------------------------------------------------------------------------
// Portal Client Profiles
// ---------------------------------------------------------------------------

export async function getPortalClientProfile(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_client_profiles WHERE client_id = ? AND tenant_id = ? LIMIT 1',
    [clientId, tenantId]
  );
  if (!rows.length) return null;
  return rowToPortalClientProfile(rows[0]);
}

export async function upsertPortalClientProfile({
  id,
  clientId,
  tenantId,
  preferredName,
  contactEmail,
  contactPhone,
  contactPreferences,
  profileDetails,
}) {
  const existing = await getPortalClientProfile(clientId, tenantId);
  const targetId = existing?.id ?? id;
  if (!targetId) {
    throw new Error('Portal client profile id is required');
  }

  await pool.query(
    `INSERT INTO portal_client_profiles
      (id, tenant_id, client_id, preferred_name_enc, contact_email_enc, contact_phone_enc, contact_preferences_enc, profile_details_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       preferred_name_enc = EXCLUDED.preferred_name_enc,
       contact_email_enc = EXCLUDED.contact_email_enc,
       contact_phone_enc = EXCLUDED.contact_phone_enc,
       contact_preferences_enc = EXCLUDED.contact_preferences_enc,
       profile_details_enc = EXCLUDED.profile_details_enc`,
    [
      targetId,
      tenantId,
      clientId,
      preferredName ? encrypt(preferredName) : null,
      contactEmail ? encrypt(contactEmail) : null,
      contactPhone ? encrypt(contactPhone) : null,
      encryptJson(contactPreferences ?? {}),
      encryptJson(profileDetails ?? {}),
    ]
  );

  return getPortalClientProfile(clientId, tenantId);
}

// ---------------------------------------------------------------------------
// Portal Settings
// ---------------------------------------------------------------------------

export async function getPortalSettings(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_settings WHERE tenant_id = ? LIMIT 1',
    [tenantId]
  );
  if (!rows.length) return null;
  return rowToPortalSettings(rows[0]);
}

export async function upsertPortalSettings({
  id,
  tenantId,
  practiceName,
  logoUrl,
  brandColor,
  accentColor,
  welcomeHeadline,
  welcomeMessage,
  helpMessage,
  supportEmail,
  registrationMode,
  allowCreateAccount,
  allowCareRequests,
  allowSchedulingRequests,
  showPublicCounselorDirectory,
  financialMode,
  suggestedOfferingCents,
  offeringMinistryNote,
  contactPreferenceOptions,
  defaultSignupFormKeys,
}) {
  const existing = await getPortalSettings(tenantId);
  const targetId = existing?.id ?? id;
  if (!targetId) {
    throw new Error('Portal settings id is required');
  }

  await pool.query(
    `INSERT INTO portal_settings
      (id, tenant_id, practice_name, logo_url, brand_color, accent_color, welcome_headline, welcome_message, help_message,
       support_email_enc, registration_mode, allow_create_account, allow_care_requests, allow_scheduling_requests,
       show_public_counselor_directory, financial_mode, suggested_offering_cents, offering_ministry_note, contact_preference_options, default_signup_form_keys)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       practice_name = EXCLUDED.practice_name,
       logo_url = EXCLUDED.logo_url,
       brand_color = EXCLUDED.brand_color,
       accent_color = EXCLUDED.accent_color,
       welcome_headline = EXCLUDED.welcome_headline,
       welcome_message = EXCLUDED.welcome_message,
       help_message = EXCLUDED.help_message,
       support_email_enc = EXCLUDED.support_email_enc,
       registration_mode = EXCLUDED.registration_mode,
       allow_create_account = EXCLUDED.allow_create_account,
       allow_care_requests = EXCLUDED.allow_care_requests,
       allow_scheduling_requests = EXCLUDED.allow_scheduling_requests,
       show_public_counselor_directory = EXCLUDED.show_public_counselor_directory,
       financial_mode = EXCLUDED.financial_mode,
       suggested_offering_cents = EXCLUDED.suggested_offering_cents,
       offering_ministry_note = EXCLUDED.offering_ministry_note,
       contact_preference_options = EXCLUDED.contact_preference_options,
       default_signup_form_keys = EXCLUDED.default_signup_form_keys`,
    [
      targetId,
      tenantId,
      practiceName,
      logoUrl,
      brandColor,
      accentColor,
      welcomeHeadline,
      welcomeMessage,
      helpMessage,
      supportEmail ? encrypt(supportEmail) : null,
      registrationMode,
      allowCreateAccount ? 1 : 0,
      allowCareRequests ? 1 : 0,
      allowSchedulingRequests ? 1 : 0,
      showPublicCounselorDirectory ? 1 : 0,
      financialMode,
      suggestedOfferingCents ?? 0,
      offeringMinistryNote ?? '',
      JSON.stringify(contactPreferenceOptions ?? []),
      JSON.stringify(defaultSignupFormKeys ?? []),
    ],
  );

  return getPortalSettings(tenantId);
}

// ---------------------------------------------------------------------------
// Portal Resources
// ---------------------------------------------------------------------------

export async function listPortalResources(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_resources WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToPortalResource);
}

export async function createPortalResource({
  id,
  tenantId,
  title,
  content,
  resourceType,
  audience,
  publishedAt,
}) {
  await pool.query(
    `INSERT INTO portal_resources
       (id, tenant_id, title, content, resource_type, audience, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, title, content, resourceType, audience ?? 'all', toSqlTimestamp(publishedAt)]
  );
  const [rows] = await pool.query(
    'SELECT * FROM portal_resources WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToPortalResource(rows[0]);
}

export async function updatePortalResource(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.title !== undefined) { setClauses.push('title = ?'); values.push(fields.title); }
  if (fields.content !== undefined) { setClauses.push('content = ?'); values.push(fields.content); }
  if (fields.resourceType !== undefined) { setClauses.push('resource_type = ?'); values.push(fields.resourceType); }
  if (fields.audience !== undefined) { setClauses.push('audience = ?'); values.push(fields.audience); }
  if (fields.publishedAt !== undefined) { setClauses.push('published_at = ?'); values.push(toSqlTimestamp(fields.publishedAt)); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE portal_resources SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM portal_resources WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToPortalResource(rows[0]);
}

// ---------------------------------------------------------------------------
// Portal Uploads
// ---------------------------------------------------------------------------

export async function listPortalUploads(tenantId, clientId, { includeContent = false } = {}) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (clientId !== undefined) {
    conditions.push('client_id = ?');
    values.push(clientId);
  }
  const [rows] = await pool.query(
    `SELECT * FROM portal_uploads WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    values,
  );
  return rows.map((row) => rowToPortalUpload(row, { includeContent }));
}

export async function getPortalUpload(id, tenantId, { includeContent = false } = {}) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_uploads WHERE id = ? AND tenant_id = ? LIMIT 1',
    [id, tenantId],
  );
  if (!rows.length) return null;
  return rowToPortalUpload(rows[0], { includeContent });
}

export async function createPortalUpload({
  id,
  tenantId,
  clientId,
  category,
  fileName,
  mimeType,
  sizeBytes,
  notes,
  contentBase64,
  uploadedByRole,
  status,
}) {
  await pool.query(
    `INSERT INTO portal_uploads
       (id, tenant_id, client_id, category, file_name_enc, mime_type, size_bytes, notes_enc, content_enc, uploaded_by_role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      category ?? 'supporting_document',
      encrypt(fileName),
      mimeType ?? 'application/octet-stream',
      Number(sizeBytes) || 0,
      notes ? encrypt(notes) : null,
      encrypt(contentBase64),
      uploadedByRole ?? 'client',
      status ?? 'uploaded',
    ],
  );
  return getPortalUpload(id, tenantId);
}

// ---------------------------------------------------------------------------
// Portal Data-Rights Requests
// ---------------------------------------------------------------------------

export async function listPortalDataRightRequests(tenantId, clientId) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (clientId !== undefined) {
    conditions.push('client_id = ?');
    values.push(clientId);
  }
  const [rows] = await pool.query(
    `SELECT * FROM portal_data_right_requests WHERE ${conditions.join(' AND ')} ORDER BY requested_at DESC, created_at DESC`,
    values,
  );
  return rows.map(rowToPortalDataRightRequest);
}

export async function createPortalDataRightRequest({
  id,
  tenantId,
  clientId,
  requestType,
  status,
  deliveryFormat,
  reasonCode,
  notes,
  policySnapshot,
  requestedAt,
  resolvedAt,
}) {
  await pool.query(
    `INSERT INTO portal_data_right_requests
       (id, tenant_id, client_id, request_type, status, delivery_format, reason_code, notes_enc, policy_snapshot, requested_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      requestType,
      status ?? 'requested',
      deliveryFormat ?? 'json',
      reasonCode ?? 'self_service_request',
      notes ? encrypt(notes) : null,
      policySnapshot ? JSON.stringify(policySnapshot) : null,
      toSqlTimestamp(requestedAt),
      toSqlTimestamp(resolvedAt),
    ],
  );
  const [rows] = await pool.query(
    'SELECT * FROM portal_data_right_requests WHERE id = ? AND tenant_id = ? LIMIT 1',
    [id, tenantId],
  );
  return rows[0] ? rowToPortalDataRightRequest(rows[0]) : null;
}

export async function updatePortalDataRightRequest(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.deliveryFormat !== undefined) { setClauses.push('delivery_format = ?'); values.push(fields.deliveryFormat); }
  if (fields.reasonCode !== undefined) { setClauses.push('reason_code = ?'); values.push(fields.reasonCode); }
  if (fields.notes !== undefined) { setClauses.push('notes_enc = ?'); values.push(fields.notes ? encrypt(fields.notes) : null); }
  if (fields.policySnapshot !== undefined) { setClauses.push('policy_snapshot = ?'); values.push(fields.policySnapshot ? JSON.stringify(fields.policySnapshot) : null); }
  if (fields.requestedAt !== undefined) { setClauses.push('requested_at = ?'); values.push(toSqlTimestamp(fields.requestedAt)); }
  if (fields.resolvedAt !== undefined) { setClauses.push('resolved_at = ?'); values.push(toSqlTimestamp(fields.resolvedAt)); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE portal_data_right_requests SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values,
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM portal_data_right_requests WHERE id = ? AND tenant_id = ? LIMIT 1',
    [id, tenantId],
  );
  return rows[0] ? rowToPortalDataRightRequest(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Portal Message Threads
// ---------------------------------------------------------------------------

export async function listPortalMessageThreads(tenantId, clientId) {
  if (clientId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM portal_message_threads WHERE tenant_id = ? AND client_id = ?',
      [tenantId, clientId]
    );
    return rows.map(rowToPortalMessageThread);
  }
  const [rows] = await pool.query(
    'SELECT * FROM portal_message_threads WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToPortalMessageThread);
}

export async function getPortalMessageThread(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_message_threads WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToPortalMessageThread(rows[0]);
}

export async function createPortalMessageThread({
  id,
  tenantId,
  clientId,
  subject,
  status,
}) {
  await pool.query(
    `INSERT INTO portal_message_threads
       (id, tenant_id, client_id, subject, status)
     VALUES (?, ?, ?, ?, ?)`,
    [id, tenantId, clientId, subject, status]
  );
  return getPortalMessageThread(id, tenantId);
}

export async function updatePortalMessageThread(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.clientId !== undefined) { setClauses.push('client_id = ?'); values.push(fields.clientId); }
  if (fields.subject !== undefined) { setClauses.push('subject = ?'); values.push(fields.subject); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE portal_message_threads SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  return getPortalMessageThread(id, tenantId);
}

// ---------------------------------------------------------------------------
// Portal Messages
// ---------------------------------------------------------------------------

export async function listPortalMessages(threadId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_messages WHERE thread_id = ? AND tenant_id = ? ORDER BY sent_at ASC',
    [threadId, tenantId]
  );
  return rows.map(rowToPortalMessage);
}

export async function createPortalMessage({
  id,
  tenantId,
  threadId,
  senderId,
  senderType,
  content,
  sentAt,
}) {
  await pool.query(
    `INSERT INTO portal_messages
       (id, tenant_id, thread_id, sender_id, sender_role, content_enc, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, threadId, senderId, senderType, encrypt(content), toSqlTimestamp(sentAt)]
  );
  const [rows] = await pool.query(
    'SELECT * FROM portal_messages WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToPortalMessage(rows[0]);
}

// ---------------------------------------------------------------------------
// Portal Appointment Requests
// ---------------------------------------------------------------------------

export async function listPortalAppointmentRequests(tenantId, clientId) {
  if (clientId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM portal_appointment_requests WHERE tenant_id = ? AND client_id = ?',
      [tenantId, clientId]
    );
    return rows.map(rowToPortalAppointmentRequest);
  }
  const [rows] = await pool.query(
    'SELECT * FROM portal_appointment_requests WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToPortalAppointmentRequest);
}

export async function createPortalAppointmentRequest({
  id,
  tenantId,
  clientId,
  preferredTimes,
  requestedType,
  notes,
  status,
  resolvedAt,
}) {
  await pool.query(
    `INSERT INTO portal_appointment_requests
       (id, tenant_id, client_id, requested_type, preferred_times, notes, status, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, clientId, requestedType ?? 'session', JSON.stringify(preferredTimes ?? []), notes, status, toSqlTimestamp(resolvedAt)]
  );
  const [rows] = await pool.query(
    'SELECT * FROM portal_appointment_requests WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToPortalAppointmentRequest(rows[0]);
}

export async function getPortalAppointmentRequest(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM portal_appointment_requests WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rows[0] ? rowToPortalAppointmentRequest(rows[0]) : null;
}

export async function updatePortalAppointmentRequest(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.clientId !== undefined) { setClauses.push('client_id = ?'); values.push(fields.clientId); }
  if (fields.preferredTimes !== undefined) { setClauses.push('preferred_times = ?'); values.push(JSON.stringify(fields.preferredTimes)); }
  if (fields.requestedType !== undefined) { setClauses.push('requested_type = ?'); values.push(fields.requestedType); }
  if (fields.notes !== undefined) { setClauses.push('notes = ?'); values.push(fields.notes); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.resolvedAt !== undefined) { setClauses.push('resolved_at = ?'); values.push(toSqlTimestamp(fields.resolvedAt)); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE portal_appointment_requests SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM portal_appointment_requests WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToPortalAppointmentRequest(rows[0]);
}
