import pool from '../pool.js';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToFaithNoteTemplate(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    focusArea: row.focus_area,
    integrationLevel: row.integration_level,
    sections: typeof row.sections === 'string' ? JSON.parse(row.sections) : (row.sections ?? []),
    createdAt: row.created_at,
  };
}

function rowToFaithGoalTemplate(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    integrationLevel: row.integration_level,
    scriptures: typeof row.scriptures === 'string' ? JSON.parse(row.scriptures) : (row.scriptures ?? []),
    milestones: typeof row.milestones === 'string' ? JSON.parse(row.milestones) : (row.milestones ?? []),
    createdAt: row.created_at,
  };
}

function rowToFaithConsentVariant(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    integrationLevel: row.integration_level,
    createdAt: row.created_at,
  };
}

function rowToFaithResource(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    resourceType: row.resource_type,
    content: row.content,
    scriptureReference: row.scripture_reference,
    createdAt: row.created_at,
  };
}

function rowToFaithInventory(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    cadence: row.cadence,
    prompts: typeof row.prompts === 'string' ? JSON.parse(row.prompts) : (row.prompts ?? []),
    createdAt: row.created_at,
  };
}

function rowToFaithChurchReferral(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    churchName: row.church_name,
    contactName: row.contact_name,
    contactMethod: row.contact_method,
    status: row.status,
    consentToCoordinate: Boolean(row.consent_to_coordinate),
    notes: row.notes,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function rowToFaithLanguagePreferences(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    practiceId: row.practice_id,
    integrationLevel: row.integration_level,
    explicitFaithLanguage: Boolean(row.explicit_faith_language),
    includePrayerLanguage: Boolean(row.include_prayer_language),
    includeScriptureReferences: Boolean(row.include_scripture_refs),
    preferredTerminology: row.preferred_terminology,
    updatedAt: row.updated_at,
  };
}

// ─── Faith Note Templates ─────────────────────────────────────────────────────

export async function listFaithNoteTemplates(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM faith_note_templates WHERE tenant_id = ?',
    [tenantId],
  );
  return rows.map(rowToFaithNoteTemplate);
}

export async function createFaithNoteTemplate({ id, tenantId, name, focusArea, integrationLevel, sections }) {
  await pool.query(
    'INSERT INTO faith_note_templates (id, tenant_id, name, focus_area, integration_level, sections) VALUES (?, ?, ?, ?, ?, ?)',
    [id, tenantId, name, focusArea ?? 'general', integrationLevel ?? 'balanced', JSON.stringify(sections ?? [])],
  );
  const [rows] = await pool.query('SELECT * FROM faith_note_templates WHERE id = ?', [id]);
  return rows[0] ? rowToFaithNoteTemplate(rows[0]) : null;
}

export async function updateFaithNoteTemplate(id, tenantId, fields) {
  const setClauses = [];
  const values = [];
  if (fields.name !== undefined) { setClauses.push('name = ?'); values.push(fields.name); }
  if (fields.focusArea !== undefined) { setClauses.push('focus_area = ?'); values.push(fields.focusArea); }
  if (fields.integrationLevel !== undefined) { setClauses.push('integration_level = ?'); values.push(fields.integrationLevel); }
  if (fields.sections !== undefined) { setClauses.push('sections = ?'); values.push(JSON.stringify(fields.sections)); }
  if (!setClauses.length) return null;
  values.push(id, tenantId);
  await pool.query(`UPDATE faith_note_templates SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
  const [rows] = await pool.query('SELECT * FROM faith_note_templates WHERE id = ?', [id]);
  return rows[0] ? rowToFaithNoteTemplate(rows[0]) : null;
}

// ─── Faith Goal Templates ─────────────────────────────────────────────────────

export async function listFaithGoalTemplates(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM faith_goal_templates WHERE tenant_id = ?',
    [tenantId],
  );
  return rows.map(rowToFaithGoalTemplate);
}

export async function createFaithGoalTemplate({ id, tenantId, title, integrationLevel, scriptures, milestones }) {
  await pool.query(
    'INSERT INTO faith_goal_templates (id, tenant_id, title, integration_level, scriptures, milestones) VALUES (?, ?, ?, ?, ?, ?)',
    [id, tenantId, title, integrationLevel ?? 'balanced', JSON.stringify(scriptures ?? []), JSON.stringify(milestones ?? [])],
  );
  const [rows] = await pool.query('SELECT * FROM faith_goal_templates WHERE id = ?', [id]);
  return rows[0] ? rowToFaithGoalTemplate(rows[0]) : null;
}

export async function updateFaithGoalTemplate(id, tenantId, fields) {
  const setClauses = [];
  const values = [];
  if (fields.title !== undefined) { setClauses.push('title = ?'); values.push(fields.title); }
  if (fields.integrationLevel !== undefined) { setClauses.push('integration_level = ?'); values.push(fields.integrationLevel); }
  if (fields.scriptures !== undefined) { setClauses.push('scriptures = ?'); values.push(JSON.stringify(fields.scriptures)); }
  if (fields.milestones !== undefined) { setClauses.push('milestones = ?'); values.push(JSON.stringify(fields.milestones)); }
  if (!setClauses.length) return null;
  values.push(id, tenantId);
  await pool.query(`UPDATE faith_goal_templates SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
  const [rows] = await pool.query('SELECT * FROM faith_goal_templates WHERE id = ?', [id]);
  return rows[0] ? rowToFaithGoalTemplate(rows[0]) : null;
}

// ─── Faith Consent Variants ───────────────────────────────────────────────────

export async function listFaithConsentVariants(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM faith_consent_variants WHERE tenant_id = ?',
    [tenantId],
  );
  return rows.map(rowToFaithConsentVariant);
}

export async function createFaithConsentVariant({ id, tenantId, title, body, audience, integrationLevel }) {
  await pool.query(
    'INSERT INTO faith_consent_variants (id, tenant_id, title, body, audience, integration_level) VALUES (?, ?, ?, ?, ?, ?)',
    [id, tenantId, title, body, audience ?? 'client', integrationLevel ?? 'balanced'],
  );
  const [rows] = await pool.query('SELECT * FROM faith_consent_variants WHERE id = ?', [id]);
  return rows[0] ? rowToFaithConsentVariant(rows[0]) : null;
}

export async function updateFaithConsentVariant(id, tenantId, fields) {
  const setClauses = [];
  const values = [];
  if (fields.title !== undefined) { setClauses.push('title = ?'); values.push(fields.title); }
  if (fields.body !== undefined) { setClauses.push('body = ?'); values.push(fields.body); }
  if (fields.audience !== undefined) { setClauses.push('audience = ?'); values.push(fields.audience); }
  if (fields.integrationLevel !== undefined) { setClauses.push('integration_level = ?'); values.push(fields.integrationLevel); }
  if (!setClauses.length) return null;
  values.push(id, tenantId);
  await pool.query(`UPDATE faith_consent_variants SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
  const [rows] = await pool.query('SELECT * FROM faith_consent_variants WHERE id = ?', [id]);
  return rows[0] ? rowToFaithConsentVariant(rows[0]) : null;
}

// ─── Faith Resources ──────────────────────────────────────────────────────────

export async function listFaithResources(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM faith_resources WHERE tenant_id = ?',
    [tenantId],
  );
  return rows.map(rowToFaithResource);
}

export async function createFaithResource({ id, tenantId, title, resourceType, content, scriptureReference }) {
  await pool.query(
    'INSERT INTO faith_resources (id, tenant_id, title, resource_type, content, scripture_reference) VALUES (?, ?, ?, ?, ?, ?)',
    [id, tenantId, title, resourceType, content, scriptureReference ?? ''],
  );
  const [rows] = await pool.query('SELECT * FROM faith_resources WHERE id = ?', [id]);
  return rows[0] ? rowToFaithResource(rows[0]) : null;
}

export async function updateFaithResource(id, tenantId, fields) {
  const setClauses = [];
  const values = [];
  if (fields.title !== undefined) { setClauses.push('title = ?'); values.push(fields.title); }
  if (fields.resourceType !== undefined) { setClauses.push('resource_type = ?'); values.push(fields.resourceType); }
  if (fields.content !== undefined) { setClauses.push('content = ?'); values.push(fields.content); }
  if (fields.scriptureReference !== undefined) { setClauses.push('scripture_reference = ?'); values.push(fields.scriptureReference); }
  if (!setClauses.length) return null;
  values.push(id, tenantId);
  await pool.query(`UPDATE faith_resources SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
  const [rows] = await pool.query('SELECT * FROM faith_resources WHERE id = ?', [id]);
  return rows[0] ? rowToFaithResource(rows[0]) : null;
}

// ─── Faith Inventories ────────────────────────────────────────────────────────

export async function listFaithInventories(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM faith_inventories WHERE tenant_id = ?',
    [tenantId],
  );
  return rows.map(rowToFaithInventory);
}

export async function createFaithInventory({ id, tenantId, name, cadence, prompts }) {
  await pool.query(
    'INSERT INTO faith_inventories (id, tenant_id, name, cadence, prompts) VALUES (?, ?, ?, ?, ?)',
    [id, tenantId, name, cadence ?? 'weekly', JSON.stringify(prompts ?? [])],
  );
  const [rows] = await pool.query('SELECT * FROM faith_inventories WHERE id = ?', [id]);
  return rows[0] ? rowToFaithInventory(rows[0]) : null;
}

// ─── Faith Church Referrals ───────────────────────────────────────────────────

export async function listFaithChurchReferrals(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM faith_church_referrals WHERE tenant_id = ?',
    [tenantId],
  );
  return rows.map(rowToFaithChurchReferral);
}

export async function createFaithChurchReferral({ id, tenantId, clientId, churchName, contactName, contactMethod, status, consentToCoordinate, notes }) {
  await pool.query(
    'INSERT INTO faith_church_referrals (id, tenant_id, client_id, church_name, contact_name, contact_method, status, consent_to_coordinate, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, tenantId, clientId, churchName, contactName ?? '', contactMethod ?? '', status ?? 'proposed', consentToCoordinate ? 1 : 0, notes ?? ''],
  );
  const [rows] = await pool.query('SELECT * FROM faith_church_referrals WHERE id = ?', [id]);
  return rows[0] ? rowToFaithChurchReferral(rows[0]) : null;
}

export async function updateFaithChurchReferral(id, tenantId, fields) {
  const setClauses = [];
  const values = [];
  if (fields.churchName !== undefined) { setClauses.push('church_name = ?'); values.push(fields.churchName); }
  if (fields.contactName !== undefined) { setClauses.push('contact_name = ?'); values.push(fields.contactName); }
  if (fields.contactMethod !== undefined) { setClauses.push('contact_method = ?'); values.push(fields.contactMethod); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.consentToCoordinate !== undefined) { setClauses.push('consent_to_coordinate = ?'); values.push(fields.consentToCoordinate ? 1 : 0); }
  if (fields.notes !== undefined) { setClauses.push('notes = ?'); values.push(fields.notes); }
  if (!setClauses.length) return null;
  values.push(id, tenantId);
  await pool.query(`UPDATE faith_church_referrals SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
  const [rows] = await pool.query('SELECT * FROM faith_church_referrals WHERE id = ?', [id]);
  return rows[0] ? rowToFaithChurchReferral(rows[0]) : null;
}

// ─── Faith Language Preferences ───────────────────────────────────────────────

export async function getFaithLanguagePreferences(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM faith_language_preferences WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1',
    [tenantId],
  );
  return rows[0] ? rowToFaithLanguagePreferences(rows[0]) : null;
}

export async function upsertFaithLanguagePreferences(tenantId, prefs) {
  const {
    practiceId, integrationLevel, explicitFaithLanguage,
    includePrayerLanguage, includeScriptureReferences, preferredTerminology,
  } = prefs;
  await pool.query(
    `INSERT INTO faith_language_preferences
       (id, tenant_id, practice_id, integration_level, explicit_faith_language, include_prayer_language, include_scripture_refs, preferred_terminology)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       integration_level = EXCLUDED.integration_level,
       explicit_faith_language = EXCLUDED.explicit_faith_language,
       include_prayer_language = EXCLUDED.include_prayer_language,
       include_scripture_refs = EXCLUDED.include_scripture_refs,
       preferred_terminology = EXCLUDED.preferred_terminology`,
    [
      `flp-${tenantId}`, tenantId, practiceId ?? null,
      integrationLevel ?? 'moderate',
      explicitFaithLanguage !== false ? 1 : 0,
      includePrayerLanguage !== false ? 1 : 0,
      includeScriptureReferences !== false ? 1 : 0,
      preferredTerminology ?? '',
    ],
  );
  return getFaithLanguagePreferences(tenantId);
}
