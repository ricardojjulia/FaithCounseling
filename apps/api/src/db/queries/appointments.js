import { randomUUID } from 'node:crypto';
import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToAppointment(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    clientName: decrypt(row.client_name_enc),
    counselorName: decrypt(row.counselor_name_enc),
    startsAt: row.starts_at instanceof Date ? row.starts_at.toISOString() : row.starts_at,
    endsAt: row.ends_at instanceof Date ? row.ends_at.toISOString() : row.ends_at,
    status: row.status,
    appointmentType: row.appointment_type,
    locationName: row.location_name,
    remoteSession: Boolean(row.remote_session),
    timezone: row.timezone,
    createdAt: row.created_at,
  };
}

function rowToReminder(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    appointmentId: row.appointment_id,
    reminderType: row.reminder_type,
    deliveryChannel: row.delivery_channel,
    reminderAt: row.reminder_at instanceof Date ? row.reminder_at.toISOString() : row.reminder_at,
    status: row.status,
    sentAt: row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at,
    createdAt: row.created_at,
  };
}

function rowToWaitlist(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    priorityRank: row.priority_rank,
    requestedService: row.requested_service,
    preferredSessionType: row.preferred_session_type,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

function rowToAvailabilityTemplate(row) {
  return {
    id: row.id,
    staffId: row.staff_id,
    tenantId: row.tenant_id,
    slots: typeof row.slots === 'string' ? JSON.parse(row.slots) : (row.slots ?? []),
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export async function listAppointments(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM appointments WHERE tenant_id = ? ORDER BY starts_at ASC',
    [tenantId]
  );
  return rows.map(rowToAppointment);
}

export async function getAppointmentById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM appointments WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToAppointment(rows[0]);
}

export async function createAppointment({
  id,
  tenantId,
  clientId,
  clientName,
  counselorName,
  startsAt,
  endsAt,
  status,
  appointmentType,
  locationName,
  remoteSession,
  timezone,
}) {
  await pool.query(
    `INSERT INTO appointments
       (id, tenant_id, client_id, client_name_enc, counselor_name_enc,
        starts_at, ends_at, status, appointment_type, location_name,
        remote_session, timezone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      encrypt(clientName),
      encrypt(counselorName),
      startsAt,
      endsAt,
      status,
      appointmentType,
      locationName,
      remoteSession ? 1 : 0,
      timezone,
    ]
  );
  return getAppointmentById(id, tenantId);
}

export async function updateAppointment(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.clientName !== undefined) {
    setClauses.push('client_name_enc = ?');
    values.push(encrypt(fields.clientName));
  }
  if (fields.counselorName !== undefined) {
    setClauses.push('counselor_name_enc = ?');
    values.push(encrypt(fields.counselorName));
  }
  if (fields.clientId !== undefined) { setClauses.push('client_id = ?'); values.push(fields.clientId); }
  if (fields.startsAt !== undefined) { setClauses.push('starts_at = ?'); values.push(fields.startsAt); }
  if (fields.endsAt !== undefined) { setClauses.push('ends_at = ?'); values.push(fields.endsAt); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.appointmentType !== undefined) { setClauses.push('appointment_type = ?'); values.push(fields.appointmentType); }
  if (fields.locationName !== undefined) { setClauses.push('location_name = ?'); values.push(fields.locationName); }
  if (fields.remoteSession !== undefined) { setClauses.push('remote_session = ?'); values.push(fields.remoteSession ? 1 : 0); }
  if (fields.timezone !== undefined) { setClauses.push('timezone = ?'); values.push(fields.timezone); }

  if (setClauses.length === 0) return getAppointmentById(id, tenantId);

  values.push(id, tenantId);
  await pool.query(
    `UPDATE appointments SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
    values
  );
  return getAppointmentById(id, tenantId);
}

export async function deleteAppointment(id, tenantId) {
  await pool.query(
    'DELETE FROM appointments WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return { deleted: true };
}

export async function listAppointmentsByDateRange(tenantId, startDate, endDate) {
  const [rows] = await pool.query(
    'SELECT * FROM appointments WHERE tenant_id = ? AND starts_at BETWEEN ? AND ? ORDER BY starts_at ASC',
    [tenantId, startDate, endDate]
  );
  return rows.map(rowToAppointment);
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export async function listReminders(tenantId, filters = {}) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (filters.clientId) { conditions.push('client_id = ?'); values.push(filters.clientId); }
  if (filters.appointmentId) { conditions.push('appointment_id = ?'); values.push(filters.appointmentId); }
  if (filters.status) { conditions.push('status = ?'); values.push(filters.status); }
  const [rows] = await pool.query(
    `SELECT * FROM reminders WHERE ${conditions.join(' AND ')} ORDER BY reminder_at ASC`,
    values
  );
  return rows.map(rowToReminder);
}

export async function createReminder({
  id,
  tenantId,
  clientId,
  appointmentId,
  reminderType,
  deliveryChannel,
  reminderAt,
  status,
  sentAt,
}) {
  await pool.query(
    `INSERT INTO reminders
       (id, tenant_id, client_id, appointment_id, reminder_type, delivery_channel, reminder_at, status, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, clientId, appointmentId, reminderType, deliveryChannel, reminderAt, status, sentAt ?? null]
  );
  const [rows] = await pool.query(
    'SELECT * FROM reminders WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToReminder(rows[0]);
}

export async function updateReminder(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.clientId !== undefined) { setClauses.push('client_id = ?'); values.push(fields.clientId); }
  if (fields.appointmentId !== undefined) { setClauses.push('appointment_id = ?'); values.push(fields.appointmentId); }
  if (fields.reminderType !== undefined) { setClauses.push('reminder_type = ?'); values.push(fields.reminderType); }
  if (fields.deliveryChannel !== undefined) { setClauses.push('delivery_channel = ?'); values.push(fields.deliveryChannel); }
  if (fields.reminderAt !== undefined) { setClauses.push('reminder_at = ?'); values.push(fields.reminderAt); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.sentAt !== undefined) { setClauses.push('sent_at = ?'); values.push(fields.sentAt); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE reminders SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM reminders WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToReminder(rows[0]);
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export async function listWaitlist(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM waitlist_metadata WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToWaitlist);
}

export async function createWaitlistEntry({
  id,
  tenantId,
  clientId,
  priorityRank,
  requestedService,
  preferredSessionType,
  notes,
}) {
  await pool.query(
    `INSERT INTO waitlist_metadata
       (id, tenant_id, client_id, priority_rank, requested_service, preferred_session_type, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, clientId, priorityRank ?? 99, requestedService ?? null, preferredSessionType ?? null, notes ?? null]
  );
  const [rows] = await pool.query(
    'SELECT * FROM waitlist_metadata WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToWaitlist(rows[0]);
}

export async function updateWaitlistEntry(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.clientId !== undefined) { setClauses.push('client_id = ?'); values.push(fields.clientId); }
  if (fields.priorityRank !== undefined) { setClauses.push('priority_rank = ?'); values.push(fields.priorityRank); }
  if (fields.requestedService !== undefined) { setClauses.push('requested_service = ?'); values.push(fields.requestedService); }
  if (fields.preferredSessionType !== undefined) { setClauses.push('preferred_session_type = ?'); values.push(fields.preferredSessionType); }
  if (fields.notes !== undefined) { setClauses.push('notes = ?'); values.push(fields.notes); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE waitlist_metadata SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM waitlist_metadata WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToWaitlist(rows[0]);
}

// ---------------------------------------------------------------------------
// Availability Templates
// ---------------------------------------------------------------------------

export async function listAvailabilityTemplates(staffId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM availability_templates WHERE staff_id = ? AND tenant_id = ?',
    [staffId, tenantId]
  );
  if (rows.length === 0) return [];
  const record = rowToAvailabilityTemplate(rows[0]);
  return record.slots;
}

export async function upsertAvailabilityTemplate(staffId, tenantId, slots) {
  await pool.query(
    `INSERT INTO availability_templates (id, staff_id, tenant_id, slots)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE slots = VALUES(slots)`,
    [randomUUID(), staffId, tenantId, JSON.stringify(slots)]
  );
}

export async function deleteAvailabilityTemplate(staffId, tenantId) {
  await pool.query(
    'DELETE FROM availability_templates WHERE staff_id = ? AND tenant_id = ?',
    [staffId, tenantId]
  );
}
