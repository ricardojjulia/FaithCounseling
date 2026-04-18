/**
 * Time Tracking query helpers.
 *
 * PHI note: `description_enc` is the only field with sensitive content and is
 * AES-256-GCM encrypted. Audit payloads must never include this field.
 *
 * All queries are tenant-scoped. Supervisors may read (not write) intern
 * entries — that authorisation logic is enforced at the route layer.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToTimeEntry(row) {
  return {
    id:              row.id,
    tenantId:        row.tenant_id,
    userId:          row.user_id,
    appointmentId:   row.appointment_id ?? null,
    category:        row.category,
    startTime:       row.start_time,
    endTime:         row.end_time,
    durationMinutes: row.duration_minutes,
    isLocked:        Boolean(row.is_locked),
    verifiedBy:      row.verified_by ?? null,
    verifiedAt:      row.verified_at ?? null,
    description:     row.description_enc ? decrypt(row.description_enc) : null,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

function rowToLicensureGoal(row) {
  return {
    id:             row.id,
    tenantId:       row.tenant_id,
    userId:         row.user_id,
    label:          row.label,
    categoryFilter: row.category_filter ? row.category_filter.split(',') : null,
    targetMinutes:  row.target_minutes,
    effectiveFrom:  row.effective_from,
    effectiveTo:    row.effective_to ?? null,
    createdAt:      row.created_at,
  };
}

// ─── Time entries ────────────────────────────────────────────────────────────

export async function listTimeEntries(tenantId, userId, { category, dateFrom, dateTo } = {}) {
  const conditions = ['tenant_id = ?', 'user_id = ?'];
  const params = [tenantId, userId];

  if (category) { conditions.push('category = ?'); params.push(category); }
  if (dateFrom)  { conditions.push('start_time >= ?'); params.push(dateFrom); }
  if (dateTo)    { conditions.push('start_time <= ?'); params.push(dateTo); }

  const [rows] = await pool.query(
    `SELECT * FROM time_entries WHERE ${conditions.join(' AND ')} ORDER BY start_time DESC`,
    params,
  );
  return rows.map(rowToTimeEntry);
}

export async function createTimeEntry({
  id, tenantId, userId, appointmentId = null,
  category, startTime, endTime, durationMinutes, description = null,
}) {
  const descEnc = description ? encrypt(String(description)) : null;
  await pool.query(
    `INSERT INTO time_entries
       (id, tenant_id, user_id, appointment_id, category, start_time, end_time,
        duration_minutes, description_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, userId, appointmentId ?? null, category, startTime, endTime,
     durationMinutes, descEnc],
  );
  const [rows] = await pool.query(
    'SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? rowToTimeEntry(rows[0]) : null;
}

export async function getTimeEntry(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? rowToTimeEntry(rows[0]) : null;
}

export async function updateTimeEntry(id, tenantId, fields) {
  const pairs = [];
  if (fields.category !== undefined)    pairs.push(['category = ?',        fields.category]);
  if (fields.startTime !== undefined)   pairs.push(['start_time = ?',      fields.startTime]);
  if (fields.endTime !== undefined)     pairs.push(['end_time = ?',        fields.endTime]);
  if (fields.durationMinutes !== undefined) pairs.push(['duration_minutes = ?', fields.durationMinutes]);
  if (fields.description !== undefined)
    pairs.push(['description_enc = ?', fields.description ? encrypt(String(fields.description)) : null]);
  if (fields.isLocked !== undefined)    pairs.push(['is_locked = ?',       fields.isLocked ? 1 : 0]);
  if (fields.verifiedBy !== undefined)  pairs.push(['verified_by = ?',     fields.verifiedBy ?? null]);
  if (fields.verifiedAt !== undefined)  pairs.push(['verified_at = ?',     fields.verifiedAt ?? null]);

  if (!pairs.length) return;
  const setClauses = pairs.map(([c]) => c).join(', ');
  const values = pairs.map(([, v]) => v);
  await pool.query(
    `UPDATE time_entries SET ${setClauses} WHERE id = ? AND tenant_id = ?`,
    [...values, id, tenantId],
  );
}

export async function deleteTimeEntry(id, tenantId) {
  await pool.query(
    'DELETE FROM time_entries WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
}

/**
 * Idempotent sync: creates a direct_clinical time entry from an appointment.
 * No-ops if one already exists for this appointment_id.
 */
export async function syncTimeEntryFromAppointment({
  id, tenantId, userId, appointmentId, startTime, endTime, durationMinutes,
}) {
  const [existing] = await pool.query(
    'SELECT id FROM time_entries WHERE appointment_id = ? AND tenant_id = ?',
    [appointmentId, tenantId],
  );
  if (existing.length) return { created: false, entry: rowToTimeEntry(existing[0]) };
  const entry = await createTimeEntry({
    id, tenantId, userId, appointmentId,
    category: 'direct_clinical', startTime, endTime, durationMinutes,
  });
  return { created: true, entry };
}

/**
 * Returns aggregate minutes by category within a date range for a user.
 */
export async function getTimeEntrySummary(tenantId, userId, { dateFrom, dateTo } = {}) {
  const conditions = ['tenant_id = ?', 'user_id = ?'];
  const params = [tenantId, userId];
  if (dateFrom) { conditions.push('start_time >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('start_time <= ?'); params.push(dateTo); }

  const [rows] = await pool.query(
    `SELECT category, SUM(duration_minutes) AS total_minutes, COUNT(*) AS entry_count
       FROM time_entries
      WHERE ${conditions.join(' AND ')}
      GROUP BY category`,
    params,
  );
  return rows.map((r) => ({
    category:     r.category,
    totalMinutes: Number(r.total_minutes),
    entryCount:   Number(r.entry_count),
  }));
}

// ─── Licensure goals ─────────────────────────────────────────────────────────

export async function listLicensureGoals(tenantId, userId) {
  const [rows] = await pool.query(
    `SELECT * FROM licensure_goals
      WHERE tenant_id = ? AND user_id = ?
      ORDER BY effective_from DESC`,
    [tenantId, userId],
  );
  return rows.map(rowToLicensureGoal);
}

export async function createLicensureGoal({
  id, tenantId, userId, label, categoryFilter = null,
  targetMinutes, effectiveFrom, effectiveTo = null,
}) {
  const catFilter = Array.isArray(categoryFilter) ? categoryFilter.join(',') : (categoryFilter ?? null);
  await pool.query(
    `INSERT INTO licensure_goals
       (id, tenant_id, user_id, label, category_filter, target_minutes, effective_from, effective_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, userId, label, catFilter, targetMinutes, effectiveFrom, effectiveTo ?? null],
  );
  const [rows] = await pool.query(
    'SELECT * FROM licensure_goals WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? rowToLicensureGoal(rows[0]) : null;
}

// ─── Supervisor assignments ───────────────────────────────────────────────────

export async function listSupervisorAssignments(tenantId, { supervisorId, internId } = {}) {
  const conditions = ['tenant_id = ?'];
  const params = [tenantId];
  if (supervisorId) { conditions.push('supervisor_id = ?'); params.push(supervisorId); }
  if (internId)     { conditions.push('intern_id = ?');     params.push(internId); }

  const [rows] = await pool.query(
    `SELECT * FROM supervisor_assignments WHERE ${conditions.join(' AND ')} ORDER BY assigned_at DESC`,
    params,
  );
  return rows.map((r) => ({
    id:           r.id,
    tenantId:     r.tenant_id,
    supervisorId: r.supervisor_id,
    internId:     r.intern_id,
    practiceId:   r.practice_id,
    assignedAt:   r.assigned_at,
  }));
}

export async function createSupervisorAssignment({ id, tenantId, supervisorId, internId, practiceId }) {
  await pool.query(
    `INSERT IGNORE INTO supervisor_assignments (id, tenant_id, supervisor_id, intern_id, practice_id)
     VALUES (?, ?, ?, ?, ?)`,
    [id, tenantId, supervisorId, internId, practiceId],
  );
  const [rows] = await pool.query(
    'SELECT * FROM supervisor_assignments WHERE supervisor_id = ? AND intern_id = ? AND practice_id = ? AND tenant_id = ?',
    [supervisorId, internId, practiceId, tenantId],
  );
  return rows.length ? {
    id: rows[0].id, tenantId: rows[0].tenant_id,
    supervisorId: rows[0].supervisor_id, internId: rows[0].intern_id,
    practiceId: rows[0].practice_id, assignedAt: rows[0].assigned_at,
  } : null;
}

export async function deleteSupervisorAssignment(id, tenantId) {
  const [result] = await pool.query(
    'DELETE FROM supervisor_assignments WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return result.affectedRows > 0;
}

/**
 * Returns true if supervisorId is assigned to internId within the tenant.
 */
export async function isSupervisorOf(tenantId, supervisorId, internId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM supervisor_assignments WHERE tenant_id = ? AND supervisor_id = ? AND intern_id = ? LIMIT 1',
    [tenantId, supervisorId, internId],
  );
  return rows.length > 0;
}
