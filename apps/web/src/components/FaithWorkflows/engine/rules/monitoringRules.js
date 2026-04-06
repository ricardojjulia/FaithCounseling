/**
 * Monitoring / Reassessment Rules
 *
 * - Assessment overdue (no scored instrument in > 90 days)
 * - PHQ-9 stable at low level → schedule routine monitoring
 * - All treatment goals met → discharge planning
 * - Long-term engagement review (active > 18 months)
 */

import { getLatestAssessment, daysSince } from '../utils.js';

const LONG_TERM_ENGAGEMENT_DAYS = 548; // ~18 months

/**
 * Rule: No clinical assessment in > 90 days for an active client
 */
export function ruleReassessmentOverdue(data, clientId) {
  if (data.client?.status !== 'active') return null;
  const assessments = (data.assessments ?? []).filter((a) => a.scoredAt || a.completedAt);
  if (assessments.length === 0) {
    return buildOverdueRec(data, clientId, null);
  }

  const sorted = [...assessments].sort(
    (a, b) => new Date(b.scoredAt ?? b.completedAt) - new Date(a.scoredAt ?? a.completedAt),
  );
  const days = daysSince(sorted[0].scoredAt ?? sorted[0].completedAt);
  if (days < 90) return null;

  return buildOverdueRec(data, clientId, days);
}

function buildOverdueRec(data, clientId, days) {
  return {
    id: `rule_monitoring_reassess:${clientId}`,
    ruleId: 'rule_monitoring_reassess',
    category: 'monitoring',
    title: days ? `Reassessment Overdue — ${days} Days` : 'No Baseline Assessment on File',
    summary: days
      ? `No scored clinical assessment in ${days} days. Routine reassessment (PHQ-9, GAD-7) is recommended.`
      : 'No completed clinical assessments found. A baseline assessment is recommended.',
    rationale: `Regular assessment data (PHQ-9, GAD-7, etc.) enables objective monitoring of symptom trajectories and informs treatment decisions. ${days ? `The last completed assessment was ${days} days ago — past the standard 90-day reassessment cycle.` : 'Without baseline data, progress cannot be objectively tracked.'}`,
    evidence: [
      days ? `Last assessment: ${days} days ago` : 'No completed assessments found',
      `Client status: ${data.client?.status ?? 'active'}`,
    ],
    priority: 5,
    confidence: 1.0,
    cautions: [],
    actions: ['add_reminder_task', 'generate_session_agenda'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Administer and score appropriate instruments at next session. Document clinical rationale for any instrument choice.',
  };
}

/**
 * Rule: All treatment goals completed → discharge planning
 */
export function ruleDischargePlanning(data, clientId) {
  const goals = data.treatmentPlan?.goals ?? [];
  if (goals.length === 0) return null;
  const allMet = goals.every((g) => g.status === 'completed');
  if (!allMet) return null;

  return {
    id: `rule_monitoring_discharge:${clientId}`,
    ruleId: 'rule_monitoring_discharge',
    category: 'monitoring',
    title: 'Discharge Planning — All Goals Met',
    summary: `All ${goals.length} treatment goal${goals.length > 1 ? 's' : ''} are marked complete. Consider initiating discharge or step-down planning.`,
    rationale: `Completing all documented treatment goals is the primary clinical indicator for discharge planning. This does not mean discharge is automatic — the counselor should assess whether the client has maintained gains, has an adequate support system, and agrees with the transition. A closing session or tapering schedule may be appropriate.`,
    evidence: [
      `${goals.length} goals completed`,
      ...goals.map((g) => `✓ "${g.description}"`),
    ],
    priority: 4,
    confidence: 0.85,
    cautions: [
      'Confirm client has maintained gains and feels prepared for transition.',
      'Document discharge rationale and after-care plan.',
    ],
    actions: ['generate_session_agenda', 'generate_note_prep', 'create_treatment_plan_update'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document discharge plan, maintenance strategy, and client readiness for transition.',
  };
}

/**
 * Rule: PHQ-9 consistently low (< 5) for 2+ consecutive scores → acknowledge stable progress
 */
export function ruleStableProgress(data, clientId) {
  const history = (data.assessments ?? [])
    .filter((a) => a.inventoryName === 'PHQ-9' && a.score != null && a.scoredAt)
    .sort((a, b) => new Date(a.scoredAt) - new Date(b.scoredAt));

  if (history.length < 2) return null;
  const recent = history.slice(-2);
  if (!recent.every((h) => h.score < 5)) return null;

  return {
    id: `rule_monitoring_stable_progress:${clientId}`,
    ruleId: 'rule_monitoring_stable_progress',
    category: 'monitoring',
    title: 'PHQ-9 Consistently Low — Stable Progress',
    summary: `PHQ-9 scores in the minimal range (< 5) for the last ${recent.length} assessments (${recent.map((h) => h.score).join(', ')}). Monitor maintenance and consider step-down.`,
    rationale: `Consistently low PHQ-9 scores suggest the client is maintaining gains. This is an appropriate time to review whether full treatment intensity is still needed, discuss maintenance strategies, and plan for reduced session frequency or discharge.`,
    evidence: [
      `PHQ-9 scores: ${recent.map((h) => h.score).join(' → ')} (both < 5)`,
    ],
    priority: 3,
    confidence: 0.90,
    cautions: [],
    actions: ['generate_session_agenda', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: `rule_monitoring_discharge:${clientId}`,
    docNote: 'Document assessment results and any step-down or discharge discussion.',
  };
}

/**
 * Rule: Active client has been in treatment for > 18 months without a formal
 * medical necessity / continuation-of-care review
 */
export function ruleLongTermEngagement(data, clientId) {
  if (data.client?.status !== 'active') return null;

  const intakeDate = data.client?.intakeDate ?? data.client?.createdAt;
  if (!intakeDate) return null;

  const days = daysSince(intakeDate);
  if (days < LONG_TERM_ENGAGEMENT_DAYS) return null;

  // Suppress if a formal review note exists
  const hasContinuationReview = (data.progressNotes ?? []).some(
    (n) => n.noteType === 'continuation_review' || (n.tags ?? []).includes('continuation_review'),
  );
  if (hasContinuationReview) return null;

  const months = Math.floor(days / 30);

  return {
    id: `rule_monitoring_long_term:${clientId}`,
    ruleId: 'rule_monitoring_long_term',
    category: 'monitoring',
    title: `Long-Term Engagement Review Recommended (${months} months)`,
    summary: `Client has been in active treatment for approximately ${months} months. A formal continuation-of-care review is recommended to confirm ongoing clinical necessity and re-evaluate goals.`,
    rationale: `Clients in active treatment beyond 18 months benefit from a structured review of treatment necessity and trajectory. This review affirms that continued counseling remains the most appropriate level of care, re-aligns goals with the client's current situation, and documents the clinical rationale for ongoing services. It also provides a natural opportunity to reassess relationship dynamics, celebrate gains, and consider step-down or adjusted frequency.`,
    evidence: [
      `Active since: ${new Date(intakeDate).toLocaleDateString()}`,
      `Duration: ~${months} months`,
      'No continuation-of-care review note found',
    ],
    priority: 4,
    confidence: 0.85,
    cautions: [
      'Long-term therapy can be clinically appropriate — this is a documentation and review prompt, not a discharge directive.',
      'Confirm with client that ongoing treatment frequency aligns with current goals.',
    ],
    actions: ['generate_session_agenda', 'create_treatment_plan_update', 'add_reminder_task'],
    faithNote: 'A review session can also be a meaningful milestone to celebrate spiritual and personal growth over the course of care.',
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document continuation-of-care review: clinical necessity, current goals, treatment response, and plan for next phase.',
  };
}
