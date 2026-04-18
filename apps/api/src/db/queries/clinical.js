import pool from '../pool.js';
import { encrypt, decrypt, encryptJson, decryptJson } from '../../lib/encrypt.js';

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

function rowToLifecycle(row) {
  return {
    clientId: row.client_id,
    tenantId: row.tenant_id,
    caseStatus: row.case_status,
    referralSource: row.referral_source,
    emergencyContact: row.emergency_contact_enc
      ? decryptJson(row.emergency_contact_enc)
      : null,
    dischargeRecord: row.discharge_record
      ? typeof row.discharge_record === 'string'
        ? JSON.parse(row.discharge_record)
        : row.discharge_record
      : null,
    updatedAt: row.updated_at,
  };
}

function rowToConsent(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    tenantId: row.tenant_id,
    consentType: row.consent_type,
    signatureState: row.signature_state,
    version: row.version,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    signedAt: row.signed_at,
  };
}

function rowToIntakePacket(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    tenantId: row.tenant_id,
    status: row.status,
    assignedForms: row.assigned_forms
      ? typeof row.assigned_forms === 'string'
        ? JSON.parse(row.assigned_forms)
        : row.assigned_forms
      : null,
    submittedAt: row.submitted_at,
  };
}

function rowToTreatmentPlan(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    tenantId: row.tenant_id,
    status: row.status,
    goals: row.goals_enc ? decryptJson(row.goals_enc) : [],
    interventions: row.interventions_enc ? decryptJson(row.interventions_enc) : [],
    reviewCadence: row.review_cadence ?? null,
    reviewedAt: row.reviewed_at ?? null,
    lastReviewedAt: row.reviewed_at ?? null,  // alias used by Faithful Workflows rules engine
    // Faith integration fields (Phase 5)
    presentingProblem: row.presenting_problem_enc ? decrypt(row.presenting_problem_enc) : null,
    faithIntegrationLevel: row.faith_integration_level ?? null,
    christianInterventions: row.christian_interventions
      ? (typeof row.christian_interventions === 'string'
          ? JSON.parse(row.christian_interventions)
          : row.christian_interventions)
      : [],
    spiritualGoals: row.spiritual_goals_enc ? decryptJson(row.spiritual_goals_enc) : [],
    scriptureAssignments: row.scripture_assignments_enc ? decrypt(row.scripture_assignments_enc) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProgressNote(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    tenantId: row.tenant_id,
    appointmentId: row.appointment_id ?? null,
    noteType: row.note_type,
    summary: decrypt(row.summary_enc),
    interventions: decrypt(row.interventions_enc),
    locked: Boolean(row.locked),
    signedBy: row.signed_by,
    signedAt: row.signed_at,
    createdAt: row.created_at,
    // Phase 2 faith-integrated clinical fields
    scriptureReference: row.scripture_reference ?? null,
    spiritualPractices: row.spiritual_practices
      ? (typeof row.spiritual_practices === 'string'
          ? JSON.parse(row.spiritual_practices)
          : row.spiritual_practices)
      : null,
    // Phase 3 cosign workflow
    cosignStatus: row.cosign_status ?? null,
    cosignRequestedBy: row.cosign_requested_by ?? null,
    cosignRequestedAt: row.cosign_requested_at ?? null,
    cosignedBy: row.cosigned_by ?? null,
    cosignedAt: row.cosigned_at ?? null,
    cosignComments: row.cosign_comments_enc ? decrypt(row.cosign_comments_enc) : null,
    // Phase 4 clinical note templates
    templateId: row.template_id ?? null,
    templateSections: row.template_sections_enc ? decryptJson(row.template_sections_enc) : null,
  };
}

function rowToInventoryDefinition(row) {
  const questionSchema = row.question_schema
    ? typeof row.question_schema === 'string'
      ? JSON.parse(row.question_schema)
      : row.question_schema
    : null;
  const scoringRules = row.scoring_rules
    ? typeof row.scoring_rules === 'string'
      ? JSON.parse(row.scoring_rules)
      : row.scoring_rules
    : null;
  const scoringMethod = row.scoring_method ?? scoringRules?.method ?? 'sum';
  const versionNumber = row.version_number ?? scoringRules?.versionNumber ?? 1;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    category: row.category,
    questionSchema,
    questions: questionSchema,
    scoringMethod,
    versionNumber,
    scoringRules: { method: scoringMethod, versionNumber },
  };
}

function rowToInventoryAssignment(row) {
  const responses = row.responses
    ? typeof row.responses === 'string'
      ? JSON.parse(row.responses)
      : row.responses
    : (row.responses_enc ? decryptJson(row.responses_enc) : null);
  return {
    id: row.id,
    clientId: row.client_id,
    tenantId: row.tenant_id,
    definitionId: row.inventory_id ?? row.definition_id,
    inventoryId: row.inventory_id ?? row.definition_id,
    assignedAt: row.created_at ?? row.assigned_at,
    status: row.status,
    responses,
    score: row.score,
    scoredAt: row.scored_at,
    completedAt: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function getLifecycle(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_lifecycles WHERE client_id = ? AND tenant_id = ?',
    [clientId, tenantId],
  );
  return rows.length ? rowToLifecycle(rows[0]) : null;
}

export async function createLifecycle({
  id,
  clientId,
  tenantId,
  caseStatus,
  referralSource,
  emergencyContact,
}) {
  const emergencyContactEnc = emergencyContact ? encryptJson(emergencyContact) : null;
  await pool.query(
    `INSERT INTO client_lifecycles
       (id, client_id, tenant_id, case_status, referral_source, emergency_contact_enc)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, clientId, tenantId, caseStatus, referralSource, emergencyContactEnc],
  );
}

export async function updateLifecycle(clientId, tenantId, fields) {
  const pairs = [];

  if (fields.caseStatus !== undefined) pairs.push(['case_status = ?', fields.caseStatus]);
  if (fields.referralSource !== undefined) pairs.push(['referral_source = ?', fields.referralSource]);
  if (fields.emergencyContact !== undefined)
    pairs.push(['emergency_contact_enc = ?', fields.emergencyContact ? encryptJson(fields.emergencyContact) : null]);
  if (fields.dischargeRecord !== undefined)
    pairs.push(['discharge_record = ?', fields.dischargeRecord ? JSON.stringify(fields.dischargeRecord) : null]);

  if (!pairs.length) return;

  pairs.push(['updated_at = NOW()', undefined]);

  const setClauses = pairs.map(([clause]) => clause).join(', ');
  const values = pairs.flatMap(([, value]) => (value !== undefined ? [value] : []));

  await pool.query(
    `UPDATE client_lifecycles SET ${setClauses} WHERE client_id = ? AND tenant_id = ?`,
    [...values, clientId, tenantId],
  );
}

// ---------------------------------------------------------------------------
// Consent records
// ---------------------------------------------------------------------------

export async function listConsents(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM consent_records WHERE client_id = ? AND tenant_id = ?',
    [clientId, tenantId],
  );
  return rows.map(rowToConsent);
}

export async function createConsent({
  id,
  clientId,
  tenantId,
  consentType,
  signatureState,
  version,
  effectiveFrom,
  effectiveTo,
}) {
  const effectiveFromSql = toSqlTimestamp(effectiveFrom);
  const effectiveToSql = toSqlTimestamp(effectiveTo);
  await pool.query(
    `INSERT INTO consent_records
       (id, client_id, tenant_id, consent_type, signature_state, version, effective_from, effective_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clientId, tenantId, consentType, signatureState, version, effectiveFromSql, effectiveToSql],
  );
  const [rows] = await pool.query(
    'SELECT * FROM consent_records WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToConsent(rows[0]) : null;
}

export async function updateConsent(id, clientId, tenantId, fields) {
  const pairs = [];

  if (fields.consentType !== undefined) pairs.push(['consent_type = ?', fields.consentType]);
  if (fields.signatureState !== undefined) pairs.push(['signature_state = ?', fields.signatureState]);
  if (fields.version !== undefined) pairs.push(['version = ?', fields.version]);
  if (fields.effectiveFrom !== undefined) pairs.push(['effective_from = ?', toSqlTimestamp(fields.effectiveFrom)]);
  if (fields.effectiveTo !== undefined) pairs.push(['effective_to = ?', toSqlTimestamp(fields.effectiveTo)]);
  if (fields.signedAt !== undefined) pairs.push(['signed_at = ?', toSqlTimestamp(fields.signedAt)]);

  if (!pairs.length) return;

  const setClauses = pairs.map(([clause]) => clause).join(', ');
  const values = pairs.map(([, value]) => value);

  await pool.query(
    `UPDATE consent_records SET ${setClauses} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    [...values, id, clientId, tenantId],
  );
}

// ---------------------------------------------------------------------------
// Intake packets
// ---------------------------------------------------------------------------

export async function getIntakePacket(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM intake_packets WHERE client_id = ? AND tenant_id = ?',
    [clientId, tenantId],
  );
  return rows.length ? rowToIntakePacket(rows[0]) : null;
}

export async function createIntakePacket({ id, clientId, tenantId, status, assignedForms, submittedAt }) {
  const assignedFormsJson = assignedForms ? JSON.stringify(assignedForms) : null;
  const submittedAtSql = toSqlTimestamp(submittedAt);
  await pool.query(
    `INSERT INTO intake_packets (id, client_id, tenant_id, status, assigned_forms, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, clientId, tenantId, status, assignedFormsJson, submittedAtSql],
  );
  const [rows] = await pool.query(
    'SELECT * FROM intake_packets WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToIntakePacket(rows[0]) : null;
}

export async function updateIntakePacket(clientId, tenantId, fields) {
  const pairs = [];

  if (fields.status !== undefined) pairs.push(['status = ?', fields.status]);
  if (fields.assignedForms !== undefined)
    pairs.push(['assigned_forms = ?', fields.assignedForms ? JSON.stringify(fields.assignedForms) : null]);
  if (fields.submittedAt !== undefined) pairs.push(['submitted_at = ?', toSqlTimestamp(fields.submittedAt)]);

  if (!pairs.length) return;

  const setClauses = pairs.map(([clause]) => clause).join(', ');
  const values = pairs.map(([, value]) => value);

  await pool.query(
    `UPDATE intake_packets SET ${setClauses} WHERE client_id = ? AND tenant_id = ?`,
    [...values, clientId, tenantId],
  );
}

// ---------------------------------------------------------------------------
// Treatment plans
// ---------------------------------------------------------------------------

export async function getTreatmentPlan(clientId, tenantId) {
  const [rows] = await pool.query(
    `SELECT * FROM treatment_plans
     WHERE client_id = ? AND tenant_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [clientId, tenantId],
  );
  return rows.length ? rowToTreatmentPlan(rows[0]) : null;
}

export async function createTreatmentPlan({
  id, clientId, tenantId, status, goals, interventions,
  reviewCadence, reviewedAt,
  presentingProblem, faithIntegrationLevel, christianInterventions, spiritualGoals, scriptureAssignments,
}) {
  const goalsEnc = goals ? encryptJson(goals) : null;
  const interventionsEnc = interventions ? encryptJson(interventions) : null;
  const presentingProblemEnc = presentingProblem ? encrypt(presentingProblem) : null;
  const christianInterventionsJson = christianInterventions ? JSON.stringify(christianInterventions) : null;
  const spiritualGoalsEnc = spiritualGoals ? encryptJson(spiritualGoals) : null;
  const scriptureAssignmentsEnc = scriptureAssignments ? encrypt(scriptureAssignments) : null;
  await pool.query(
    `INSERT INTO treatment_plans
       (id, client_id, tenant_id, status, goals_enc, interventions_enc,
        review_cadence, reviewed_at,
        presenting_problem_enc, faith_integration_level, christian_interventions,
        spiritual_goals_enc, scripture_assignments_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, clientId, tenantId, status, goalsEnc, interventionsEnc,
      reviewCadence ?? null, reviewedAt ?? null,
      presentingProblemEnc, faithIntegrationLevel ?? null, christianInterventionsJson,
      spiritualGoalsEnc, scriptureAssignmentsEnc,
    ],
  );
}

export async function updateTreatmentPlan(clientId, tenantId, fields) {
  // Resolve the most recent plan id first
  const [planRows] = await pool.query(
    `SELECT id FROM treatment_plans
     WHERE client_id = ? AND tenant_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [clientId, tenantId],
  );
  if (!planRows.length) return;
  const planId = planRows[0].id;

  const pairs = [];

  if (fields.status !== undefined) pairs.push(['status = ?', fields.status]);
  if (fields.goals !== undefined)
    pairs.push(['goals_enc = ?', fields.goals ? encryptJson(fields.goals) : null]);
  if (fields.interventions !== undefined)
    pairs.push(['interventions_enc = ?', fields.interventions ? encryptJson(fields.interventions) : null]);
  if (fields.reviewCadence !== undefined)
    pairs.push(['review_cadence = ?', fields.reviewCadence || null]);
  if (fields.reviewedAt !== undefined)
    pairs.push(['reviewed_at = ?', fields.reviewedAt || null]);
  // Faith integration fields (Phase 5)
  if (fields.presentingProblem !== undefined)
    pairs.push(['presenting_problem_enc = ?', fields.presentingProblem ? encrypt(fields.presentingProblem) : null]);
  if (fields.faithIntegrationLevel !== undefined)
    pairs.push(['faith_integration_level = ?', fields.faithIntegrationLevel || null]);
  if (fields.christianInterventions !== undefined)
    pairs.push(['christian_interventions = ?', fields.christianInterventions ? JSON.stringify(fields.christianInterventions) : null]);
  if (fields.spiritualGoals !== undefined)
    pairs.push(['spiritual_goals_enc = ?', fields.spiritualGoals ? encryptJson(fields.spiritualGoals) : null]);
  if (fields.scriptureAssignments !== undefined)
    pairs.push(['scripture_assignments_enc = ?', fields.scriptureAssignments ? encrypt(fields.scriptureAssignments) : null]);

  if (!pairs.length) return;

  pairs.push(['updated_at = NOW()', undefined]);

  const setClauses = pairs.map(([clause]) => clause).join(', ');
  const values = pairs.flatMap(([, value]) => (value !== undefined ? [value] : []));

  await pool.query(
    `UPDATE treatment_plans SET ${setClauses} WHERE id = ?`,
    [...values, planId],
  );
}

// ---------------------------------------------------------------------------
// Progress notes
// ---------------------------------------------------------------------------

export async function listProgressNotes(clientId, tenantId) {
  const [rows] = await pool.query(
    `SELECT * FROM progress_notes
     WHERE client_id = ? AND tenant_id = ?
     ORDER BY created_at DESC`,
    [clientId, tenantId],
  );
  return rows.map(rowToProgressNote);
}

export async function createProgressNote({
  id,
  clientId,
  tenantId,
  appointmentId,
  noteType,
  summary,
  interventions,
  lockedNote,
  signedBy,
  signedAt,
  scriptureReference = null,
  spiritualPractices = null,
  templateId = null,
  templateSections = null,
}) {
  const summaryEnc = summary ? encrypt(summary) : null;
  const interventionsEnc = interventions ? encrypt(interventions) : null;
  const signedAtSql = toSqlTimestamp(signedAt);
  const apptId = appointmentId ?? null;
  const spiritualPracticesJson = spiritualPractices
    ? JSON.stringify(spiritualPractices)
    : null;
  const templateSectionsEnc = templateSections ? encryptJson(templateSections) : null;
  await pool.query(
    `INSERT INTO progress_notes
       (id, client_id, tenant_id, appointment_id, note_type, summary_enc, interventions_enc,
        locked, signed_by, signed_at, scripture_reference, spiritual_practices,
        template_id, template_sections_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clientId, tenantId, apptId, noteType, summaryEnc, interventionsEnc,
     lockedNote ? 1 : 0, signedBy, signedAtSql, scriptureReference ?? null, spiritualPracticesJson,
     templateId ?? null, templateSectionsEnc],
  );
  const [rows] = await pool.query(
    'SELECT * FROM progress_notes WHERE id = ? AND client_id = ? AND tenant_id = ?',
    [id, clientId, tenantId],
  );
  return rows.length ? rowToProgressNote(rows[0]) : null;
}

export async function updateProgressNote(id, clientId, tenantId, fields) {
  const pairs = [];

  if (fields.noteType !== undefined) pairs.push(['note_type = ?', fields.noteType]);
  if (fields.summary !== undefined)
    pairs.push(['summary_enc = ?', fields.summary ? encrypt(fields.summary) : null]);
  if (fields.interventions !== undefined)
    pairs.push(['interventions_enc = ?', fields.interventions ? encrypt(fields.interventions) : null]);
  if (fields.lockedNote !== undefined) pairs.push(['locked = ?', fields.lockedNote ? 1 : 0]);
  if (fields.signedBy !== undefined) pairs.push(['signed_by = ?', fields.signedBy]);
  if (fields.signedAt !== undefined) pairs.push(['signed_at = ?', toSqlTimestamp(fields.signedAt)]);
  // Phase 2 faith fields
  if (fields.scriptureReference !== undefined)
    pairs.push(['scripture_reference = ?', fields.scriptureReference ?? null]);
  if (fields.spiritualPractices !== undefined)
    pairs.push(['spiritual_practices = ?', fields.spiritualPractices ? JSON.stringify(fields.spiritualPractices) : null]);
  // Phase 3 cosign workflow
  if (fields.cosignStatus !== undefined) pairs.push(['cosign_status = ?', fields.cosignStatus ?? null]);
  if (fields.cosignRequestedBy !== undefined) pairs.push(['cosign_requested_by = ?', fields.cosignRequestedBy ?? null]);
  if (fields.cosignRequestedAt !== undefined) pairs.push(['cosign_requested_at = ?', toSqlTimestamp(fields.cosignRequestedAt)]);
  if (fields.cosignedBy !== undefined) pairs.push(['cosigned_by = ?', fields.cosignedBy ?? null]);
  if (fields.cosignedAt !== undefined) pairs.push(['cosigned_at = ?', toSqlTimestamp(fields.cosignedAt)]);
  if (fields.cosignComments !== undefined)
    pairs.push(['cosign_comments_enc = ?', fields.cosignComments ? encrypt(fields.cosignComments) : null]);
  // Phase 4 clinical note templates
  if (fields.templateId !== undefined)
    pairs.push(['template_id = ?', fields.templateId ?? null]);
  if (fields.templateSections !== undefined)
    pairs.push(['template_sections_enc = ?', fields.templateSections ? encryptJson(fields.templateSections) : null]);

  if (!pairs.length) return;

  const setClauses = pairs.map(([clause]) => clause).join(', ');
  const values = pairs.map(([, value]) => value);

  await pool.query(
    `UPDATE progress_notes SET ${setClauses} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    [...values, id, clientId, tenantId],
  );
}

// ---------------------------------------------------------------------------
// Inventory definitions
// ---------------------------------------------------------------------------

export async function listInventoryDefinitions(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM inventory_definitions WHERE tenant_id = ?',
    [tenantId],
  );
  return rows.map(rowToInventoryDefinition);
}

export async function createInventoryDefinition({
  id,
  tenantId,
  name,
  category,
  questions,
  scoringRules,
  questionSchema,
  scoringMethod,
  versionNumber,
}) {
  const normalizedQuestionSchema = questionSchema ?? questions ?? null;
  const normalizedScoringMethod = scoringMethod ?? scoringRules?.method ?? 'sum';
  const normalizedVersionNumber = versionNumber ?? scoringRules?.versionNumber ?? 1;
  const questionSchemaJson = normalizedQuestionSchema ? JSON.stringify(normalizedQuestionSchema) : null;
  await pool.query(
    `INSERT INTO inventory_definitions (id, tenant_id, name, category, scoring_method, version_number, question_schema)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, name, category, normalizedScoringMethod, normalizedVersionNumber, questionSchemaJson],
  );
}

// ---------------------------------------------------------------------------
// Inventory assignments
// ---------------------------------------------------------------------------

export async function listInventoryAssignments(tenantId, { clientId, inventoryId } = {}) {
  const conditions = ['tenant_id = ?'];
  const values = [tenantId];
  if (clientId) {
    conditions.push('client_id = ?');
    values.push(clientId);
  }
  if (inventoryId) {
    conditions.push('inventory_id = ?');
    values.push(inventoryId);
  }
  const [rows] = await pool.query(
    `SELECT * FROM inventory_assignments WHERE ${conditions.join(' AND ')}`,
    values,
  );
  return rows.map(rowToInventoryAssignment);
}

export async function createInventoryAssignment({
  id,
  clientId,
  tenantId,
  definitionId,
  inventoryId,
  assignedAt,
  status,
  responses,
  score,
  scoredAt,
  completedAt,
}) {
  const inventoryIdValue = inventoryId ?? definitionId;
  const assignedAtSql = toSqlTimestamp(assignedAt);
  const scoredAtSql = toSqlTimestamp(scoredAt);
  const completedAtSql = toSqlTimestamp(completedAt);
  const responsesJson = responses ? JSON.stringify(responses) : null;
  await pool.query(
    `INSERT INTO inventory_assignments
       (id, client_id, tenant_id, inventory_id, created_at, status, responses, score, scored_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clientId, tenantId, inventoryIdValue, assignedAtSql, status, responsesJson, score ?? null, scoredAtSql, completedAtSql],
  );
}

export async function updateInventoryAssignment(id, clientId, tenantId, fields) {
  const pairs = [];

  if (fields.status !== undefined) pairs.push(['status = ?', fields.status]);
  if (fields.responses !== undefined)
    pairs.push(['responses = ?', fields.responses ? JSON.stringify(fields.responses) : null]);
  if (fields.score !== undefined) pairs.push(['score = ?', fields.score]);
  if (fields.scoredAt !== undefined) pairs.push(['scored_at = ?', toSqlTimestamp(fields.scoredAt)]);
  if (fields.completedAt !== undefined) pairs.push(['completed_at = ?', toSqlTimestamp(fields.completedAt)]);

  if (!pairs.length) return;

  const setClauses = pairs.map(([clause]) => clause).join(', ');
  const values = pairs.map(([, value]) => value);

  await pool.query(
    `UPDATE inventory_assignments SET ${setClauses} WHERE id = ? AND client_id = ? AND tenant_id = ?`,
    [...values, id, clientId, tenantId],
  );
}
