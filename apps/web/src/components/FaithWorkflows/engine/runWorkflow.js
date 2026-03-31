/**
 * Workflow Orchestrator
 *
 * Calls all rule sets for a given client, filters and deduplicates output,
 * sorts recommendations by category order + priority, and returns the full
 * ClientRankEntry for use in the UI.
 *
 * SAFETY INVARIANTS enforced here:
 * 1. Safety recommendations always appear first (regardless of sort).
 * 2. Spiritual recommendations are never ordered before safety or clinical_caution.
 * 3. Recommendations with priority ≥ SAFETY_LOCK_THRESHOLD cannot have status 'hidden' or 'deferred'.
 * 4. No recommendation is generated for a null/undefined client.
 */

import { CATEGORY_ORDER, SAFETY_LOCK_THRESHOLD } from './types.js';
import { scoreClient } from './scoreClient.js';
import { lastSeenDate } from './utils.js';

// Safety rules
import {
  rulePhq9Severe,
  rulePhq9SuicidalIdeation,
  rulePcl5High,
  ruleConsecutiveNoShows,
  ruleRiskKeywordInNote,
} from './rules/safetyRules.js';

// Clinical caution rules
import {
  rulePhq9Worsening,
  ruleGad7High,
  ruleNoTreatmentPlan,
  ruleStaleTreatmentPlan,
  ruleNoRecentNote,
  ruleDiagnosisWithoutGoal,
} from './rules/clinicalRules.js';

// Session focus rules
import {
  ruleOverdueGoals,
  rulePendingHomework,
  rulePendingAssessment,
} from './rules/sessionRules.js';

// Homework rules
import {
  ruleNoRecentHomework,
  ruleJournalSuggestion,
} from './rules/homeworkRules.js';

// Relationship rules
import {
  ruleSystemsGoalMissing,
  ruleRelationshipConcernInNote,
} from './rules/relationshipRules.js';

// Spiritual rules
import {
  ruleBiblicalIntegration,
  ruleFaithBasedGriefSupport,
  ruleFaithTransitionSupport,
  ruleFaithAcknowledge,
} from './rules/spiritualRules.js';

// Coordination rules
import {
  ruleNoInsurance,
  ruleOpenReferral,
  ruleFaithReferralAvailable,
  ruleClosingSummaryNeeded,
} from './rules/coordinationRules.js';

// Monitoring rules
import {
  ruleReassessmentOverdue,
  ruleDischargePlanning,
  ruleStableProgress,
} from './rules/monitoringRules.js';

/** All rule functions, in evaluation order. */
const ALL_RULES = [
  // Safety (always first)
  rulePhq9Severe,
  rulePhq9SuicidalIdeation,
  rulePcl5High,
  ruleConsecutiveNoShows,
  ruleRiskKeywordInNote,
  // Clinical
  rulePhq9Worsening,
  ruleGad7High,
  ruleNoTreatmentPlan,
  ruleStaleTreatmentPlan,
  ruleNoRecentNote,
  ruleDiagnosisWithoutGoal,
  // Session
  ruleOverdueGoals,
  rulePendingHomework,
  rulePendingAssessment,
  // Homework
  ruleNoRecentHomework,
  ruleJournalSuggestion,
  // Relationship
  ruleSystemsGoalMissing,
  ruleRelationshipConcernInNote,
  // Spiritual (last among generative rules)
  ruleBiblicalIntegration,
  ruleFaithBasedGriefSupport,
  ruleFaithTransitionSupport,
  ruleFaithAcknowledge,
  // Coordination
  ruleNoInsurance,
  ruleOpenReferral,
  ruleFaithReferralAvailable,
  ruleClosingSummaryNeeded,
  // Monitoring
  ruleReassessmentOverdue,
  ruleDischargePlanning,
  ruleStableProgress,
];

/**
 * Runs all rules for a client and returns sorted recommendations.
 * @param {import('./types.js').ClientWorkflowData} data
 * @returns {import('./types.js').Recommendation[]}
 */
export function runWorkflow(data) {
  if (!data?.client?.id) return [];

  const clientId = data.client.id;
  const results = [];

  for (const rule of ALL_RULES) {
    try {
      const rec = rule(data, clientId);
      if (rec) results.push(rec);
    } catch (err) {
      // Rules must never crash the UI. Silently skip and log.
      console.warn(`[FaithWorkflows] Rule ${rule.name} threw for client ${clientId}:`, err);
    }
  }

  // Deduplicate by id (safety: rules should not produce duplicate ids)
  const seen = new Set();
  const deduped = results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  // Enforce safety lock: priority ≥ SAFETY_LOCK_THRESHOLD cannot be hidden/deferred
  const locked = deduped.map((r) => {
    if (r.priority >= SAFETY_LOCK_THRESHOLD && (r.status === 'hidden' || r.status === 'deferred')) {
      return { ...r, status: 'pending' };
    }
    return r;
  });

  // Sort: category order first, then by priority descending within category
  locked.sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    return b.priority - a.priority;
  });

  return locked;
}

/**
 * Builds a full ClientRankEntry for the client list panel.
 * @param {import('./types.js').ClientWorkflowData} data
 * @returns {import('./types.js').ClientRankEntry}
 */
export function buildClientRankEntry(data) {
  const recommendations = runWorkflow(data);
  const scoring = scoreClient(data, recommendations);
  const lastSeen = lastSeenDate(data.appointments);

  return {
    clientId: data.client.id,
    displayName: [data.client.firstName, data.client.lastName].filter(Boolean).join(' ').trim() || data.client.id,
    status: data.client.status ?? 'unknown',
    highTouchpoint: Boolean(data.client.highTouchpoint),
    ...scoring,
    recommendationCount: recommendations.filter((r) => r.status === 'pending').length,
    lastActivityDate: lastSeen,
    recommendations,
  };
}

/**
 * Builds a lightweight rank entry from basic client list data (no enriched data).
 * Used for initial sorting before full data loads.
 * @param {Object} client — basic client from GET /v1/clients
 * @returns {import('./types.js').ClientRankEntry}
 */
export function buildLightweightRankEntry(client) {
  const isHTP = Boolean(client.highTouchpoint);
  return {
    clientId: client.id,
    displayName: [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.id,
    status: client.status ?? 'unknown',
    highTouchpoint: isHTP,
    urgencyScore: isHTP ? 15 : 5,
    urgencyLevel: isHTP ? 'moderate' : 'routine',
    recommendationCount: 0,
    topReasonChips: isHTP ? ['High touchpoint'] : [],
    diagnosisSummary: '',
    lastActivityDate: null,
    trend: 'unknown',
    recommendations: [],
  };
}
