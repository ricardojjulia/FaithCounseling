/**
 * Staff domain query helpers.
 *
 * Covers: staff_members, practices, locations, availability_templates.
 *
 * PHI columns (first_name_enc, last_name_enc, license_number_enc, bio_enc,
 * address_enc) are always encrypted at write time and decrypted at read time
 * using the field-level AES-256-GCM helpers in lib/encrypt.js.
 *
 * All queries use parameterized PostgreSQL syntax — no string interpolation in SQL.
 */

import pool from '../pool.js';
import { encrypt, decrypt } from '../../lib/encrypt.js';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToStaff(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    role: row.role,
    firstName: decrypt(row.first_name_enc),
    lastName: decrypt(row.last_name_enc),
    licenseType: row.license_type,
    licenseNumber: decrypt(row.license_number_enc),
    supervisionStatus: row.supervision_status,
    supervisingStaffId: row.supervising_staff_id,
    bio: decrypt(row.bio_enc),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPractice(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    type: row.practice_type,
    timezone: row.timezone,
    faithTradition: row.faith_tradition,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    // JaaS per-practice video config. jaasPrivateKeyConfigured is a boolean
    // sentinel so callers can know if a key exists without ever returning the
    // ciphertext over the wire.
    jaasAppId: row.jaas_app_id ?? null,
    jaasApiKeyId: row.jaas_api_key_id ?? null,
    jaasPrivateKeyConfigured: Boolean(row.jaas_private_key_enc),
    jaasDomain: row.jaas_domain ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLocation(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    practiceId: row.practice_id,
    name: row.name,
    address: decrypt(row.address_enc),
    capacity: row.capacity,
    remoteEnabled: Boolean(row.remote_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The availability_templates table stores one row per staff member with a JSON
 * `slots` column — array of { dayOfWeek, startTime, endTime, locationId,
 * remoteAvailable }. The helpers below expose a per-day API consistent with the
 * spec while reading/writing that single JSON blob.
 */
function rowToTemplates(row) {
  const slots =
    typeof row.slots === 'string'
      ? JSON.parse(row.slots)
      : (row.slots ?? []);
  return slots;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

/**
 * Returns all staff members for the given tenant (decrypted).
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listStaff(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM staff_members WHERE tenant_id = ? ORDER BY created_at ASC',
    [tenantId],
  );
  return rows.map(rowToStaff);
}

/**
 * Returns a single staff member or null.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getStaffById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM staff_members WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? rowToStaff(rows[0]) : null;
}

/**
 * Inserts a new staff member and returns the created object.
 * @param {{
 *   id: string, tenantId: string, role: string,
 *   firstName: string, lastName: string,
 *   licenseType?: string, licenseNumber?: string,
 *   supervisionStatus?: string, supervisingStaffId?: string,
 *   locationIds?: string[], bio?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createStaff({
  id,
  tenantId,
  role,
  firstName,
  lastName,
  licenseType = null,
  licenseNumber = null,
  supervisionStatus = 'not_required',
  supervisingStaffId = null,
  bio = null,
}) {
  await pool.query(
    `INSERT INTO staff_members
       (id, tenant_id, role, first_name_enc, last_name_enc,
        license_type, license_number_enc, supervision_status,
        supervising_staff_id, bio_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      role,
      encrypt(firstName),
      encrypt(lastName),
      licenseType,
      encrypt(licenseNumber),
      supervisionStatus,
      supervisingStaffId,
      encrypt(bio),
    ],
  );
  return getStaffById(id, tenantId);
}

/**
 * Updates the given fields on a staff member and returns the updated object.
 * @param {string} id
 * @param {string} tenantId
 * @param {Partial<object>} fields  camelCase staff field names
 * @returns {Promise<object|null>}
 */
export async function updateStaff(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.role !== undefined) {
    setClauses.push('role = ?');
    values.push(fields.role);
  }
  if (fields.firstName !== undefined) {
    setClauses.push('first_name_enc = ?');
    values.push(encrypt(fields.firstName));
  }
  if (fields.lastName !== undefined) {
    setClauses.push('last_name_enc = ?');
    values.push(encrypt(fields.lastName));
  }
  if (fields.licenseType !== undefined) {
    setClauses.push('license_type = ?');
    values.push(fields.licenseType);
  }
  if (fields.licenseNumber !== undefined) {
    setClauses.push('license_number_enc = ?');
    values.push(encrypt(fields.licenseNumber));
  }
  if (fields.supervisionStatus !== undefined) {
    setClauses.push('supervision_status = ?');
    values.push(fields.supervisionStatus);
  }
  if (fields.supervisingStaffId !== undefined) {
    setClauses.push('supervising_staff_id = ?');
    values.push(fields.supervisingStaffId);
  }
  if (fields.bio !== undefined) {
    setClauses.push('bio_enc = ?');
    values.push(encrypt(fields.bio));
  }

  if (setClauses.length === 0) return getStaffById(id, tenantId);

  values.push(id, tenantId);
  await pool.query(
    `UPDATE staff_members SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
    values,
  );
  return getStaffById(id, tenantId);
}

// ─── Practices ────────────────────────────────────────────────────────────────

/**
 * Returns all practices for the given tenant.
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listPractices(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM practices WHERE tenant_id = ? ORDER BY created_at ASC',
    [tenantId],
  );
  return rows.map(rowToPractice);
}

/**
 * Returns a single practice or null.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getPracticeById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM practices WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? rowToPractice(rows[0]) : null;
}

/**
 * Returns the raw jaas_private_key_enc ciphertext for a practice — only used
 * server-side inside the video session handler. The plaintext private key is
 * NEVER returned over the API.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<string|null>}
 */
export async function getPracticeVideoKeyEnc(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT jaas_private_key_enc FROM practices WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? (rows[0].jaas_private_key_enc ?? null) : null;
}

/**
 * Inserts a new practice and returns the created object.
 * @param {{
 *   id: string, tenantId: string, name: string, type?: string,
 *   timezone?: string, faithTradition?: string,
 *   contactEmail?: string, contactPhone?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createPractice({
  id,
  tenantId,
  name,
  type = 'solo',
  timezone = 'America/New_York',
  faithTradition = null,
  contactEmail = null,
  contactPhone = null,
}) {
  await pool.query(
    `INSERT INTO practices
       (id, tenant_id, name, practice_type, timezone,
        faith_tradition, contact_email, contact_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, name, type, timezone, faithTradition, contactEmail, contactPhone],
  );
  return getPracticeById(id, tenantId);
}

/**
 * Updates the given fields on a practice and returns the updated object.
 * @param {string} id
 * @param {string} tenantId
 * @param {Partial<object>} fields
 * @returns {Promise<object|null>}
 */
export async function updatePractice(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.name !== undefined) {
    setClauses.push('name = ?');
    values.push(fields.name);
  }
  if (fields.type !== undefined) {
    setClauses.push('practice_type = ?');
    values.push(fields.type);
  }
  if (fields.timezone !== undefined) {
    setClauses.push('timezone = ?');
    values.push(fields.timezone);
  }
  if (fields.faithTradition !== undefined) {
    setClauses.push('faith_tradition = ?');
    values.push(fields.faithTradition);
  }
  if (fields.contactEmail !== undefined) {
    setClauses.push('contact_email = ?');
    values.push(fields.contactEmail);
  }
  if (fields.contactPhone !== undefined) {
    setClauses.push('contact_phone = ?');
    values.push(fields.contactPhone);
  }
  if (fields.jaasAppId !== undefined) {
    setClauses.push('jaas_app_id = ?');
    values.push(fields.jaasAppId);
  }
  if (fields.jaasApiKeyId !== undefined) {
    setClauses.push('jaas_api_key_id = ?');
    values.push(fields.jaasApiKeyId);
  }
  if (fields.jaasPrivateKeyEnc !== undefined) {
    setClauses.push('jaas_private_key_enc = ?');
    values.push(fields.jaasPrivateKeyEnc);
  }
  if (fields.jaasDomain !== undefined) {
    setClauses.push('jaas_domain = ?');
    values.push(fields.jaasDomain);
  }

  if (setClauses.length === 0) return getPracticeById(id, tenantId);

  values.push(id, tenantId);
  await pool.query(
    `UPDATE practices SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
    values,
  );
  return getPracticeById(id, tenantId);
}

// ─── Locations ────────────────────────────────────────────────────────────────

/**
 * Returns all locations for the given tenant (address decrypted).
 * @param {string} tenantId
 * @returns {Promise<object[]>}
 */
export async function listLocations(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM locations WHERE tenant_id = ? ORDER BY created_at ASC',
    [tenantId],
  );
  return rows.map(rowToLocation);
}

/**
 * Returns a single location or null.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getLocationById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM locations WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return rows.length ? rowToLocation(rows[0]) : null;
}

/**
 * Inserts a new location and returns the created object.
 * @param {{
 *   id: string, tenantId: string, practiceId?: string, name: string,
 *   address?: string, capacity?: number, remoteEnabled?: boolean
 * }} data
 * @returns {Promise<object>}
 */
export async function createLocation({
  id,
  tenantId,
  practiceId = null,
  name,
  address = null,
  capacity = 1,
  remoteEnabled = false,
}) {
  await pool.query(
    `INSERT INTO locations
       (id, tenant_id, practice_id, name, address_enc, capacity, remote_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, practiceId, name, encrypt(address), capacity, remoteEnabled ? 1 : 0],
  );
  return getLocationById(id, tenantId);
}

/**
 * Updates the given fields on a location and returns the updated object.
 * @param {string} id
 * @param {string} tenantId
 * @param {Partial<object>} fields
 * @returns {Promise<object|null>}
 */
export async function updateLocation(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.practiceId !== undefined) {
    setClauses.push('practice_id = ?');
    values.push(fields.practiceId);
  }
  if (fields.name !== undefined) {
    setClauses.push('name = ?');
    values.push(fields.name);
  }
  if (fields.address !== undefined) {
    setClauses.push('address_enc = ?');
    values.push(encrypt(fields.address));
  }
  if (fields.capacity !== undefined) {
    setClauses.push('capacity = ?');
    values.push(fields.capacity);
  }
  if (fields.remoteEnabled !== undefined) {
    setClauses.push('remote_enabled = ?');
    values.push(fields.remoteEnabled ? 1 : 0);
  }

  if (setClauses.length === 0) return getLocationById(id, tenantId);

  values.push(id, tenantId);
  await pool.query(
    `UPDATE locations SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
    values,
  );
  return getLocationById(id, tenantId);
}

/**
 * Deletes a location and returns { deleted: true }.
 * @param {string} id
 * @param {string} tenantId
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteLocation(id, tenantId) {
  await pool.query(
    'DELETE FROM locations WHERE id = ? AND tenant_id = ?',
    [id, tenantId],
  );
  return { deleted: true };
}

// ─── Availability templates ───────────────────────────────────────────────────
//
// The availability_templates table stores one row per staff member identified
// by (staff_id, tenant_id) with a JSON `slots` column.  Each slot is:
//   { dayOfWeek: number, startTime: string, endTime: string,
//     locationId: string|null, remoteAvailable: boolean }
//
// The helpers below expose a per-day API as specified.

/**
 * Returns all availability slots for a staff member.
 * @param {string} staffId
 * @param {string} tenantId
 * @returns {Promise<object[]>}  array of slot objects
 */
export async function listAvailabilityTemplates(staffId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM availability_templates WHERE staff_id = ? AND tenant_id = ?',
    [staffId, tenantId],
  );
  if (!rows.length) return [];
  return rowToTemplates(rows[0]);
}

/**
 * Upserts a single day-slot within the staff member's availability template.
 * If a slot for the given dayOfWeek already exists it is replaced; otherwise
 * it is added.  If no template row exists yet one is created.
 *
 * @param {{
 *   staffId: string, tenantId: string, dayOfWeek: number,
 *   startTime: string, endTime: string,
 *   locationId?: string, remoteAvailable?: boolean
 * }} data
 * @returns {Promise<object[]>}  full updated slots array
 */
export async function upsertAvailabilityTemplate({
  staffId,
  tenantId,
  dayOfWeek,
  startTime,
  endTime,
  locationId = null,
  remoteAvailable = false,
}) {
  // Fetch current slots (may not exist yet).
  const [rows] = await pool.query(
    'SELECT id, slots FROM availability_templates WHERE staff_id = ? AND tenant_id = ?',
    [staffId, tenantId],
  );

  const newSlot = { dayOfWeek, startTime, endTime, locationId, remoteAvailable };

  if (rows.length === 0) {
    // No template row yet — insert one.
    const newId = `${staffId}-${tenantId}`;
    await pool.query(
      `INSERT INTO availability_templates (id, staff_id, tenant_id, slots)
       VALUES (?, ?, ?, ?)`,
      [newId, staffId, tenantId, JSON.stringify([newSlot])],
    );
  } else {
    const existingSlots =
      typeof rows[0].slots === 'string'
        ? JSON.parse(rows[0].slots)
        : (rows[0].slots ?? []);

    const idx = existingSlots.findIndex((s) => s.dayOfWeek === dayOfWeek);
    if (idx >= 0) {
      existingSlots[idx] = newSlot;
    } else {
      existingSlots.push(newSlot);
    }
    // Sort by day for predictable ordering.
    existingSlots.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    await pool.query(
      'UPDATE availability_templates SET slots = ? WHERE staff_id = ? AND tenant_id = ?',
      [JSON.stringify(existingSlots), staffId, tenantId],
    );
  }

  return listAvailabilityTemplates(staffId, tenantId);
}

/**
 * Removes the slot for a specific dayOfWeek from a staff member's template.
 * No-ops gracefully if the slot or the template row does not exist.
 *
 * @param {string} staffId
 * @param {string} tenantId
 * @param {number} dayOfWeek
 * @returns {Promise<void>}
 */
export async function deleteAvailabilityTemplate(staffId, tenantId, dayOfWeek) {
  const [rows] = await pool.query(
    'SELECT slots FROM availability_templates WHERE staff_id = ? AND tenant_id = ?',
    [staffId, tenantId],
  );
  if (!rows.length) return;

  const existingSlots =
    typeof rows[0].slots === 'string'
      ? JSON.parse(rows[0].slots)
      : (rows[0].slots ?? []);

  const filtered = existingSlots.filter((s) => s.dayOfWeek !== dayOfWeek);

  await pool.query(
    'UPDATE availability_templates SET slots = ? WHERE staff_id = ? AND tenant_id = ?',
    [JSON.stringify(filtered), staffId, tenantId],
  );
}
