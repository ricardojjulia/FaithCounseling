import { randomUUID } from 'node:crypto';
import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

const APPOINTMENT_SELECT = `
  SELECT
    a.id,
    a.tenant_id,
    a.client_id,
    a.counselor_id,
    a.client_name_enc,
    a.counselor_name_enc,
    c.first_name_enc AS client_first_name_enc,
    c.last_name_enc AS client_last_name_enc,
    s.first_name_enc AS counselor_first_name_enc,
    s.last_name_enc AS counselor_last_name_enc,
    a.appointment_type,
    a.status,
    a.starts_at,
    a.ends_at,
    a.location_name AS stored_location_name,
    a.timezone,
    a.scheduled_at,
    a.duration_minutes,
    a.location_id,
    l.name AS resolved_location_name,
    a.series_id,
    a.remote_session,
    a.created_at,
    a.updated_at
  FROM appointments a
  LEFT JOIN clients c
    ON c.id = a.client_id
   AND c.tenant_id = a.tenant_id
  LEFT JOIN staff_members s
    ON s.id = a.counselor_id
   AND s.tenant_id = a.tenant_id
  LEFT JOIN locations l
    ON l.id = a.location_id
   AND l.tenant_id = a.tenant_id
`;

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToAppointment(row) {
  const startsAtIso = toIsoString(row.starts_at ?? row.scheduled_at);
  const storedEndsAtIso = toIsoString(row.ends_at);
  const fallbackDurationMinutes = Number.isFinite(Number(row.duration_minutes)) ? Number(row.duration_minutes) : 50;
  const endsAtIso = storedEndsAtIso ?? (
    startsAtIso
      ? new Date(new Date(startsAtIso).getTime() + (fallbackDurationMinutes * 60_000)).toISOString()
      : null
  );
  const durationMinutes = computeDurationMinutes(startsAtIso, endsAtIso);

  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    counselorId: row.counselor_id ?? null,
    clientName: resolveDisplayName({
      firstNameEnc: row.client_first_name_enc,
      lastNameEnc: row.client_last_name_enc,
      fallbackEnc: row.client_name_enc,
    }),
    counselorName: resolveDisplayName({
      firstNameEnc: row.counselor_first_name_enc,
      lastNameEnc: row.counselor_last_name_enc,
      fallbackEnc: row.counselor_name_enc,
    }),
    startsAt: startsAtIso,
    endsAt: endsAtIso,
    status: row.status,
    appointmentType: row.appointment_type,
    locationId: row.location_id,
    locationName: row.stored_location_name ?? row.resolved_location_name ?? (row.remote_session ? 'Remote Session' : null),
    seriesId: row.series_id ?? null,
    remoteSession: Boolean(row.remote_session),
    durationMinutes,
    timezone: row.timezone ?? 'UTC',
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

function rowToOverride(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    staffId: row.staff_id,
    overrideDate: row.override_date instanceof Date
      ? row.override_date.toISOString().slice(0, 10)
      : row.override_date,
    overrideType: row.override_type,
    reason: row.reason ?? null,
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    allDay: Boolean(row.all_day),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSeries(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    counselorId: row.counselor_id,
    clientId: row.client_id,
    clientName: row.client_name_enc ? decrypt(row.client_name_enc) : null,
    counselorName: row.counselor_name_enc ? decrypt(row.counselor_name_enc) : null,
    appointmentType: row.appointment_type,
    recurrenceRule: row.recurrence_rule,
    startDate: row.start_date instanceof Date ? row.start_date.toISOString().slice(0, 10) : row.start_date,
    endDate: row.end_date instanceof Date ? row.end_date.toISOString().slice(0, 10) : (row.end_date ?? null),
    startTime: row.start_time ?? '09:00',
    durationMinutes: Number(row.duration_minutes) || 50,
    locationId: row.location_id ?? null,
    remoteSession: Boolean(row.remote_session),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export async function listAppointments(tenantId, { clientId, counselorId, seriesId } = {}) {
  const conditions = ['a.tenant_id = ?'];
  const args = [tenantId];

  if (clientId) {
    conditions.push('a.client_id = ?');
    args.push(clientId);
  }
  if (counselorId) {
    conditions.push('a.counselor_id = ?');
    args.push(counselorId);
  }
  if (seriesId) {
    conditions.push('a.series_id = ?');
    args.push(seriesId);
  }

  const [rows] = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE ${conditions.join('\n       AND ')}
     ORDER BY COALESCE(a.starts_at, a.scheduled_at) ASC`,
    args
  );
  return rows.map(rowToAppointment);
}

export async function getAppointmentById(id, tenantId) {
  const [rows] = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE a.id = ?
       AND a.tenant_id = ?`,
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToAppointment(rows[0]);
}

export async function createAppointment({
  id,
  tenantId,
  clientId,
  counselorId = null,
  clientName,
  counselorName,
  startsAt,
  endsAt,
  status,
  appointmentType,
  locationName,
  remoteSession,
  timezone,
  seriesId = null,
}) {
  const startsAtSql = toSqlTimestamp(startsAt);
  const endsAtSql = toSqlTimestamp(endsAt);
  const durationMinutes = computeDurationMinutes(startsAt, endsAt);
  const locationId = remoteSession ? null : await resolveLocationId(tenantId, locationName);
  const effectiveLocationName = remoteSession ? 'Remote Session' : (locationName?.trim() || 'Main Office');

  await pool.query(
    `INSERT INTO appointments
       (id, tenant_id, client_id, counselor_id, client_name_enc, counselor_name_enc,
        starts_at, ends_at, scheduled_at, duration_minutes, status, appointment_type,
        location_id, location_name, timezone, remote_session, series_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      counselorId,
      encrypt(clientName),
      encrypt(counselorName),
      startsAtSql,
      endsAtSql,
      startsAtSql,
      durationMinutes,
      status,
      appointmentType,
      locationId,
      effectiveLocationName,
      timezone ?? 'UTC',
      remoteSession ? 1 : 0,
      seriesId,
    ]
  );
  return getAppointmentById(id, tenantId);
}

export async function updateAppointment(id, tenantId, fields) {
  const current = await getAppointmentById(id, tenantId);
  if (!current) return null;

  const setClauses = [];
  const values = [];

  if (fields.clientName !== undefined) {
    setClauses.push('client_name_enc = ?');
    values.push(encrypt(fields.clientName));
  }
  if (fields.counselorId !== undefined) {
    setClauses.push('counselor_id = ?');
    values.push(fields.counselorId);
  }
  if (fields.counselorName !== undefined) {
    setClauses.push('counselor_name_enc = ?');
    values.push(encrypt(fields.counselorName));
  }
  if (fields.clientId !== undefined) { setClauses.push('client_id = ?'); values.push(fields.clientId); }
  if (fields.startsAt !== undefined) {
    const startsAtSql = toSqlTimestamp(fields.startsAt);
    setClauses.push('starts_at = ?');
    values.push(startsAtSql);
    setClauses.push('scheduled_at = ?');
    values.push(startsAtSql);
  }
  if (fields.endsAt !== undefined) {
    setClauses.push('ends_at = ?');
    values.push(toSqlTimestamp(fields.endsAt));
  }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.appointmentType !== undefined) { setClauses.push('appointment_type = ?'); values.push(fields.appointmentType); }
  if (fields.locationName !== undefined) {
    const locationId = fields.remoteSession === true
      ? null
      : await resolveLocationId(tenantId, fields.locationName);
    setClauses.push('location_id = ?');
    values.push(locationId);
    setClauses.push('location_name = ?');
    values.push(fields.remoteSession === true ? 'Remote Session' : (fields.locationName?.trim() || 'Main Office'));
  }
  if (fields.remoteSession !== undefined) { setClauses.push('remote_session = ?'); values.push(fields.remoteSession ? 1 : 0); }
  if (fields.remoteSession === true && fields.locationName === undefined) {
    setClauses.push('location_id = ?');
    values.push(null);
    setClauses.push('location_name = ?');
    values.push('Remote Session');
  }
  if (fields.timezone !== undefined) {
    setClauses.push('timezone = ?');
    values.push(fields.timezone);
  }

  if (fields.startsAt !== undefined || fields.endsAt !== undefined) {
    const effectiveStart = fields.startsAt ?? current.startsAt;
    const effectiveEnd = fields.endsAt ?? current.endsAt;
    setClauses.push('duration_minutes = ?');
    values.push(computeDurationMinutes(effectiveStart, effectiveEnd));
  }

  if (setClauses.length === 0) return current;

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
  const sqlStart = toSqlTimestamp(startDate);
  const sqlEnd = toSqlTimestamp(endDate);
  const [rows] = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE a.tenant_id = ?
       AND COALESCE(a.starts_at, a.scheduled_at) BETWEEN ? AND ?
     ORDER BY COALESCE(a.starts_at, a.scheduled_at) ASC`,
    [tenantId, sqlStart, sqlEnd]
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
  if (rows.length === 0) return null;
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
  if (rows.length === 0) return null;
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

// ---------------------------------------------------------------------------
// Availability Overrides
// ---------------------------------------------------------------------------

export async function listAvailabilityOverrides(tenantId, staffId, from, to) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (staffId) { conditions.push('staff_id = ?'); values.push(staffId); }
  if (from) { conditions.push('override_date >= ?'); values.push(from); }
  if (to) { conditions.push('override_date <= ?'); values.push(to); }
  const [rows] = await pool.query(
    `SELECT * FROM availability_overrides WHERE ${conditions.join(' AND ')} ORDER BY override_date ASC`,
    values
  );
  return rows.map(rowToOverride);
}

export async function createAvailabilityOverride({
  id,
  tenantId,
  staffId,
  overrideDate,
  overrideType,
  reason,
  startTime,
  endTime,
  allDay,
}) {
  await pool.query(
    `INSERT INTO availability_overrides
       (id, tenant_id, staff_id, override_date, override_type, reason, start_time, end_time, all_day)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, staffId, overrideDate, overrideType ?? 'block', reason ?? null, startTime ?? null, endTime ?? null, allDay !== false ? 1 : 0]
  );
  const [rows] = await pool.query(
    'SELECT * FROM availability_overrides WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToOverride(rows[0]);
}

export async function updateAvailabilityOverride(id, tenantId, fields) {
  const setClauses = [];
  const values = [];
  if (fields.overrideDate !== undefined) { setClauses.push('override_date = ?'); values.push(fields.overrideDate); }
  if (fields.overrideType !== undefined) { setClauses.push('override_type = ?'); values.push(fields.overrideType); }
  if (fields.reason !== undefined) { setClauses.push('reason = ?'); values.push(fields.reason); }
  if (fields.startTime !== undefined) { setClauses.push('start_time = ?'); values.push(fields.startTime); }
  if (fields.endTime !== undefined) { setClauses.push('end_time = ?'); values.push(fields.endTime); }
  if (fields.allDay !== undefined) { setClauses.push('all_day = ?'); values.push(fields.allDay ? 1 : 0); }
  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE availability_overrides SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }
  const [rows] = await pool.query(
    'SELECT * FROM availability_overrides WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToOverride(rows[0]);
}

export async function deleteAvailabilityOverride(id, tenantId) {
  await pool.query(
    'DELETE FROM availability_overrides WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Appointment Series
// ---------------------------------------------------------------------------

export async function listSeries(tenantId, filters = {}) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (filters.counselorId) { conditions.push('counselor_id = ?'); values.push(filters.counselorId); }
  if (filters.clientId) { conditions.push('client_id = ?'); values.push(filters.clientId); }
  if (filters.status) { conditions.push('status = ?'); values.push(filters.status); }
  const [rows] = await pool.query(
    `SELECT * FROM appointment_series WHERE ${conditions.join(' AND ')} ORDER BY start_date ASC`,
    values
  );
  return rows.map(rowToSeries);
}

export async function createSeries({
  id,
  tenantId,
  counselorId,
  clientId,
  clientName,
  counselorName,
  appointmentType,
  recurrenceRule,
  startDate,
  endDate,
  startTime,
  durationMinutes,
  locationId,
  remoteSession,
}) {
  await pool.query(
    `INSERT INTO appointment_series
       (id, tenant_id, counselor_id, client_id, client_name_enc, counselor_name_enc,
        appointment_type, recurrence_rule, start_date, end_date, start_time, duration_minutes,
        location_id, remote_session, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      id, tenantId, counselorId, clientId,
      clientName ? encrypt(clientName) : null,
      counselorName ? encrypt(counselorName) : null,
      appointmentType ?? null, recurrenceRule,
      startDate, endDate ?? null,
      startTime ?? '09:00',
      durationMinutes ?? 50, locationId ?? null,
      remoteSession ? 1 : 0,
    ]
  );
  const [rows] = await pool.query(
    'SELECT * FROM appointment_series WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToSeries(rows[0]);
}

export async function updateSeries(id, tenantId, fields) {
  const setClauses = [];
  const values = [];
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.endDate !== undefined) { setClauses.push('end_date = ?'); values.push(fields.endDate); }
  if (fields.recurrenceRule !== undefined) { setClauses.push('recurrence_rule = ?'); values.push(fields.recurrenceRule); }
  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE appointment_series SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }
  const [rows] = await pool.query(
    'SELECT * FROM appointment_series WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToSeries(rows[0]);
}

// ---------------------------------------------------------------------------
// Utilization Reporting
// ---------------------------------------------------------------------------

export async function getUtilizationSummary(tenantId, from, to, counselorId) {
  const conditions = ['a.tenant_id = ?'];
  const values = [tenantId];
  if (from) { conditions.push('COALESCE(a.starts_at, a.scheduled_at) >= ?'); values.push(toSqlTimestamp(from + 'T00:00:00Z')); }
  if (to) { conditions.push('COALESCE(a.starts_at, a.scheduled_at) <= ?'); values.push(toSqlTimestamp(to + 'T23:59:59Z')); }
  if (counselorId) { conditions.push('a.counselor_id = ?'); values.push(counselorId); }

  const where = conditions.join(' AND ');

  const [[totalRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM appointments a WHERE ${where}`,
    values
  );

  const [statusRows] = await pool.query(
    `SELECT status, COUNT(*) AS cnt FROM appointments a WHERE ${where} GROUP BY status`,
    values
  );

  const [counselorRows] = await pool.query(
    `SELECT counselor_id, COUNT(*) AS total_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count
     FROM appointments a WHERE ${where} GROUP BY counselor_id`,
    values
  );

  const [locationRows] = await pool.query(
    `SELECT COALESCE(a.location_name, l.name, 'Remote') AS location_name, COUNT(*) AS cnt
     FROM appointments a
     LEFT JOIN locations l ON l.id = a.location_id AND l.tenant_id = a.tenant_id
     WHERE ${where}
     GROUP BY a.location_name, l.name`,
    values
  );

  const byStatus = {};
  for (const r of statusRows) byStatus[r.status] = Number(r.cnt);

  return {
    period: { from: from ?? null, to: to ?? null },
    totalAppointments: Number(totalRow.total),
    byStatus,
    byCounselor: counselorRows.map(r => ({
      counselorId: r.counselor_id,
      count: Number(r.total_count),
      completedCount: Number(r.completed_count),
    })),
    byLocation: locationRows.map(r => ({
      locationName: r.location_name,
      count: Number(r.cnt),
    })),
  };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function resolveDisplayName({ firstNameEnc, lastNameEnc, fallbackEnc }) {
  const firstName = firstNameEnc ? decrypt(firstNameEnc) : '';
  const lastName = lastNameEnc ? decrypt(lastNameEnc) : '';
  const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (joined) return joined;
  return fallbackEnc ? decrypt(fallbackEnc) : null;
}

function computeDurationMinutes(startsAt, endsAt) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 50;
  }
  return Math.max(1, Math.round((end - start) / 60_000));
}

function toSqlTimestamp(value) {
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

async function resolveLocationId(tenantId, locationName) {
  if (typeof locationName !== 'string' || !locationName.trim()) return null;
  const [rows] = await pool.query(
    'SELECT id FROM locations WHERE tenant_id = ? AND name = ? ORDER BY updated_at DESC LIMIT 1',
    [tenantId, locationName.trim()],
  );
  return rows[0]?.id ?? null;
}
