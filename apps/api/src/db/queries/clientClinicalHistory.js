/**
 * Client clinical history query helpers (singleton per client).
 *
 * PHI columns use encrypt/decrypt or encryptJson/decryptJson as appropriate.
 * The upsert function uses INSERT ... ON CONFLICT DO UPDATE to maintain
 * a single row per client enforced by the UNIQUE constraint uq_cclinical_client.
 *
 * All queries are tenant-scoped and parameterised — no string interpolation.
 */

import pool from '../pool.js';
import { encrypt, decrypt, encryptJson, decryptJson } from '../../lib/encrypt.js';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToClientClinicalHistory(row) {
  return {
    id:                       row.id,
    tenantId:                 row.tenant_id,
    clientId:                 row.client_id,
    // Medical history
    pastHospitalizations:     Boolean(row.past_hospitalizations),
    hospitalizations:         row.hospitalizations_enc != null ? decrypt(row.hospitalizations_enc) : null,
    pastSurgeries:            Boolean(row.past_surgeries),
    surgeries:                row.surgeries_enc != null ? decrypt(row.surgeries_enc) : null,
    chronicConditions:        row.chronic_conditions_enc != null ? decryptJson(row.chronic_conditions_enc) : null,
    pcpName:                  row.pcp_name_enc != null ? decrypt(row.pcp_name_enc) : null,
    pcpPractice:              row.pcp_practice_enc != null ? decrypt(row.pcp_practice_enc) : null,
    pcpPhone:                 row.pcp_phone_enc != null ? decrypt(row.pcp_phone_enc) : null,
    preferredPharmacy:        row.preferred_pharmacy_enc != null ? decryptJson(row.preferred_pharmacy_enc) : null,
    substanceUseScreen:       row.substance_use_screen_enc != null ? decryptJson(row.substance_use_screen_enc) : null,
    // Mental health history
    mhPriorTreatment:         Boolean(row.mh_prior_treatment),
    mhPriorTreatmentDetail:   row.mh_prior_treatment_enc != null ? decrypt(row.mh_prior_treatment_enc) : null,
    mhPriorHospitalizations:  Boolean(row.mh_prior_hospitalizations),
    mhHospitalizations:       row.mh_hospitalizations_enc != null ? decrypt(row.mh_hospitalizations_enc) : null,
    mhPriorDiagnoses:         row.mh_prior_diagnoses_enc != null ? decrypt(row.mh_prior_diagnoses_enc) : null,
    // Risk assessment
    siCurrent:                Boolean(row.si_current),
    siHistory:                Boolean(row.si_history),
    siPlan:                   Boolean(row.si_plan),
    siMeansAccess:            Boolean(row.si_means_access),
    siIntent:                 Boolean(row.si_intent),
    hiCurrent:                Boolean(row.hi_current),
    hiHistory:                Boolean(row.hi_history),
    selfHarmHistory:          Boolean(row.self_harm_history),
    riskNotes:                row.risk_notes_enc != null ? decrypt(row.risk_notes_enc) : null,
    lastRiskAssessmentAt:     row.last_risk_assessment_at ?? null,
    riskAssessedBy:           row.risk_assessed_by ?? null,
    createdAt:                row.created_at,
    updatedAt:                row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the clinical history record for a client, or null if none exists.
 * @param {string} clientId
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getClientClinicalHistory(clientId, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_clinical_history WHERE client_id = ? AND tenant_id = ?',
    [clientId, tenantId],
  );
  return rows.length ? rowToClientClinicalHistory(rows[0]) : null;
}

/**
 * Inserts or updates the clinical history singleton for a client.
 * Uses INSERT ... ON CONFLICT DO UPDATE keyed on the UNIQUE (client_id) constraint.
 * @param {{
 *   id: string, tenantId: string, clientId: string,
 *   pastHospitalizations?: boolean, hospitalizations?: string,
 *   pastSurgeries?: boolean, surgeries?: string,
 *   chronicConditions?: object, pcpName?: string,
 *   pcpPractice?: string, pcpPhone?: string, preferredPharmacy?: object,
 *   substanceUseScreen?: object,
 *   mhPriorTreatment?: boolean, mhPriorTreatmentDetail?: string,
 *   mhPriorHospitalizations?: boolean, mhHospitalizations?: string,
 *   mhPriorDiagnoses?: string,
 *   siCurrent?: boolean, siHistory?: boolean, siPlan?: boolean,
 *   siMeansAccess?: boolean, siIntent?: boolean,
 *   hiCurrent?: boolean, hiHistory?: boolean, selfHarmHistory?: boolean,
 *   riskNotes?: string, lastRiskAssessmentAt?: string, riskAssessedBy?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function upsertClientClinicalHistory({
  id,
  tenantId,
  clientId,
  pastHospitalizations = false,
  hospitalizations = null,
  pastSurgeries = false,
  surgeries = null,
  chronicConditions = null,
  pcpName = null,
  pcpPractice = null,
  pcpPhone = null,
  preferredPharmacy = null,
  substanceUseScreen = null,
  mhPriorTreatment = false,
  mhPriorTreatmentDetail = null,
  mhPriorHospitalizations = false,
  mhHospitalizations = null,
  mhPriorDiagnoses = null,
  siCurrent = false,
  siHistory = false,
  siPlan = false,
  siMeansAccess = false,
  siIntent = false,
  hiCurrent = false,
  hiHistory = false,
  selfHarmHistory = false,
  riskNotes = null,
  lastRiskAssessmentAt = null,
  riskAssessedBy = null,
}) {
  const hospitalizationsEnc      = hospitalizations != null ? encrypt(String(hospitalizations)) : null;
  const surgeriesEnc             = surgeries != null ? encrypt(String(surgeries)) : null;
  const chronicConditionsEnc     = chronicConditions != null ? encryptJson(chronicConditions) : null;
  const pcpNameEnc               = pcpName != null ? encrypt(String(pcpName)) : null;
  const pcpPracticeEnc           = pcpPractice != null ? encrypt(String(pcpPractice)) : null;
  const pcpPhoneEnc              = pcpPhone != null ? encrypt(String(pcpPhone)) : null;
  const preferredPharmacyEnc     = preferredPharmacy != null ? encryptJson(preferredPharmacy) : null;
  const substanceUseScreenEnc    = substanceUseScreen != null ? encryptJson(substanceUseScreen) : null;
  const mhPriorTreatmentEnc      = mhPriorTreatmentDetail != null ? encrypt(String(mhPriorTreatmentDetail)) : null;
  const mhHospitalizationsEnc    = mhHospitalizations != null ? encrypt(String(mhHospitalizations)) : null;
  const mhPriorDiagnosesEnc      = mhPriorDiagnoses != null ? encrypt(String(mhPriorDiagnoses)) : null;
  const riskNotesEnc             = riskNotes != null ? encrypt(String(riskNotes)) : null;

  await pool.query(
    `INSERT INTO client_clinical_history
       (id, tenant_id, client_id,
        past_hospitalizations, hospitalizations_enc,
        past_surgeries, surgeries_enc,
        chronic_conditions_enc, pcp_name_enc, pcp_practice_enc, pcp_phone_enc,
        preferred_pharmacy_enc, substance_use_screen_enc,
        mh_prior_treatment, mh_prior_treatment_enc,
        mh_prior_hospitalizations, mh_hospitalizations_enc,
        mh_prior_diagnoses_enc,
        si_current, si_history, si_plan, si_means_access, si_intent,
        hi_current, hi_history, self_harm_history,
        risk_notes_enc, last_risk_assessment_at, risk_assessed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT ON CONSTRAINT uq_cclinical_client DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       past_hospitalizations = EXCLUDED.past_hospitalizations,
       hospitalizations_enc = EXCLUDED.hospitalizations_enc,
       past_surgeries = EXCLUDED.past_surgeries,
       surgeries_enc = EXCLUDED.surgeries_enc,
       chronic_conditions_enc = EXCLUDED.chronic_conditions_enc,
       pcp_name_enc = EXCLUDED.pcp_name_enc,
       pcp_practice_enc = EXCLUDED.pcp_practice_enc,
       pcp_phone_enc = EXCLUDED.pcp_phone_enc,
       preferred_pharmacy_enc = EXCLUDED.preferred_pharmacy_enc,
       substance_use_screen_enc = EXCLUDED.substance_use_screen_enc,
       mh_prior_treatment = EXCLUDED.mh_prior_treatment,
       mh_prior_treatment_enc = EXCLUDED.mh_prior_treatment_enc,
       mh_prior_hospitalizations = EXCLUDED.mh_prior_hospitalizations,
       mh_hospitalizations_enc = EXCLUDED.mh_hospitalizations_enc,
       mh_prior_diagnoses_enc = EXCLUDED.mh_prior_diagnoses_enc,
       si_current = EXCLUDED.si_current,
       si_history = EXCLUDED.si_history,
       si_plan = EXCLUDED.si_plan,
       si_means_access = EXCLUDED.si_means_access,
       si_intent = EXCLUDED.si_intent,
       hi_current = EXCLUDED.hi_current,
       hi_history = EXCLUDED.hi_history,
       self_harm_history = EXCLUDED.self_harm_history,
       risk_notes_enc = EXCLUDED.risk_notes_enc,
       last_risk_assessment_at = EXCLUDED.last_risk_assessment_at,
       risk_assessed_by = EXCLUDED.risk_assessed_by`,
    [
      id,
      tenantId,
      clientId,
      pastHospitalizations ? 1 : 0,
      hospitalizationsEnc,
      pastSurgeries ? 1 : 0,
      surgeriesEnc,
      chronicConditionsEnc,
      pcpNameEnc,
      pcpPracticeEnc,
      pcpPhoneEnc,
      preferredPharmacyEnc,
      substanceUseScreenEnc,
      mhPriorTreatment ? 1 : 0,
      mhPriorTreatmentEnc,
      mhPriorHospitalizations ? 1 : 0,
      mhHospitalizationsEnc,
      mhPriorDiagnosesEnc,
      siCurrent ? 1 : 0,
      siHistory ? 1 : 0,
      siPlan ? 1 : 0,
      siMeansAccess ? 1 : 0,
      siIntent ? 1 : 0,
      hiCurrent ? 1 : 0,
      hiHistory ? 1 : 0,
      selfHarmHistory ? 1 : 0,
      riskNotesEnc,
      lastRiskAssessmentAt ?? null,
      riskAssessedBy ?? null,
    ],
  );
  return getClientClinicalHistory(clientId, tenantId);
}
