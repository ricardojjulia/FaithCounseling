/**
 * Clinical Caution Rules
 *
 * Fires for clinically significant patterns that require counselor attention
 * but are not immediate safety crises:
 * - PHQ-9 worsening trend across sessions
 * - GAD-7 high (≥15) — medication coordination flag
 * - No active treatment plan
 * - Stale treatment plan (>90 days without review)
 * - No progress note in 30+ days for an active client
 * - Diagnosis with no corresponding treatment goal
 */

import { getLatestAssessment, getScoreHistory, isWorseningTrend, daysSince } from '../utils.js';

/**
 * Rule: PHQ-9 worsening trend (last 2–3 scores increasing)
 */
export function rulePhq9Worsening(data, clientId) {
  const history = getScoreHistory(data.assessments, 'PHQ-9');
  if (history.length < 2) return null;

  const recent = history.slice(-3);
  if (!isWorseningTrend(recent.map((h) => h.score))) return null;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const delta = (last.score ?? 0) - (first.score ?? 0);

  return {
    id: `rule_clinical_phq9_worsening:${clientId}`,
    ruleId: 'rule_clinical_phq9_worsening',
    category: 'clinical_caution',
    title: 'PHQ-9 Worsening Trend',
    summary: `PHQ-9 has increased by ${delta} points across ${recent.length} recent scores (${recent.map((h) => h.score).join('→')}). Review treatment approach.`,
    rationale: `A consistent upward trend in PHQ-9 scores suggests the current treatment approach may not be adequately addressing depressive symptoms. This warrants a session focused on treatment review — including whether modality, frequency, or adjunctive supports (medication, group therapy) should be considered.`,
    evidence: [
      `PHQ-9 trend: ${recent.map((h) => h.score).join(' → ')}`,
      `Change: +${delta} points over ${recent.length} assessments`,
      `Most recent: ${last.score} on ${last.scoredAt ? new Date(last.scoredAt).toLocaleDateString() : 'unknown'}`,
    ],
    priority: 8,
    confidence: 0.85,
    cautions: [
      'Rule out external stressors (bereavement, medical changes) before adjusting treatment.',
    ],
    actions: ['generate_session_agenda', 'generate_note_prep', 'create_treatment_plan_update'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document treatment review rationale and any adjustments to goals or modality.',
  };
}

/**
 * Rule: GAD-7 high (≥ 15) — possible medication coordination
 */
export function ruleGad7High(data, clientId) {
  const latest = getLatestAssessment(data.assessments, 'GAD-7');
  if (!latest || latest.score == null || latest.score < 15) return null;

  return {
    id: `rule_clinical_gad7_high:${clientId}`,
    ruleId: 'rule_clinical_gad7_high',
    category: 'clinical_caution',
    title: 'GAD-7 Severe — Consider Medication Coordination',
    summary: `GAD-7 score of ${latest.score} indicates severe anxiety. Consider coordinating with prescribing physician or psychiatrist.`,
    rationale: `A GAD-7 score of ${latest.score} falls in the severe range (≥15). At this level, research supports a combined approach of therapy and pharmacotherapy. If the client is not currently receiving medication management, a referral or coordination conversation with their physician may be appropriate. Ensure this is a client-collaborative decision.`,
    evidence: [
      `GAD-7 score: ${latest.score} (severe range ≥15)`,
      `Scored: ${latest.scoredAt ? new Date(latest.scoredAt).toLocaleDateString() : 'unknown'}`,
    ],
    priority: 6,
    confidence: 0.80,
    cautions: [
      'Medication recommendation requires physician or psychiatrist — counselors do not prescribe.',
      'Frame as collaborative option, not directive.',
    ],
    actions: ['generate_session_agenda', 'generate_note_prep', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document discussion of medication coordination option and client response.',
  };
}

/**
 * Rule: No active treatment plan
 */
export function ruleNoTreatmentPlan(data, clientId) {
  const plan = data.treatmentPlan;
  if (plan && ['active', 'draft'].includes(plan.status)) return null;
  // Only fire for active clients
  if (data.client?.status !== 'active') return null;

  return {
    id: `rule_clinical_no_treatment_plan:${clientId}`,
    ruleId: 'rule_clinical_no_treatment_plan',
    category: 'clinical_caution',
    title: 'No Active Treatment Plan',
    summary: 'This active client has no treatment plan on file. A plan is required to guide care and meet documentation standards.',
    rationale: 'Active clients should have a treatment plan defining goals, interventions, and review schedule. Without a plan, care lacks documented direction and may not meet clinical or insurance requirements.',
    evidence: [
      'No active treatment plan found in client record',
      `Client status: ${data.client?.status ?? 'unknown'}`,
    ],
    priority: 7,
    confidence: 1.0,
    cautions: [],
    actions: ['create_treatment_plan_update', 'generate_session_agenda'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Create treatment plan with measurable goals, target dates, and review schedule.',
  };
}

/**
 * Rule: Treatment plan not reviewed in > 90 days
 */
export function ruleStaleTreatmentPlan(data, clientId) {
  const plan = data.treatmentPlan;
  if (!plan || plan.status !== 'active') return null;

  const reviewedAt = plan.lastReviewedAt ?? plan.updatedAt;
  if (!reviewedAt) return null;

  const days = daysSince(reviewedAt);
  if (days < 90) return null;

  return {
    id: `rule_clinical_stale_treatment_plan:${clientId}`,
    ruleId: 'rule_clinical_stale_treatment_plan',
    category: 'clinical_caution',
    title: `Treatment Plan Overdue for Review (${days} days)`,
    summary: `Treatment plan has not been reviewed in ${days} days. Most guidelines recommend review every 90 days or at each milestone.`,
    rationale: `Treatment plans should be reviewed regularly to confirm goals remain appropriate, track progress, and adjust interventions. This plan was last reviewed ${days} days ago — past the standard 90-day review cycle. A review session or plan update is recommended.`,
    evidence: [
      `Last reviewed: ${new Date(reviewedAt).toLocaleDateString()}`,
      `Days since review: ${days}`,
    ],
    priority: 7,
    confidence: 1.0,
    cautions: [],
    actions: ['create_treatment_plan_update', 'generate_session_agenda'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document treatment plan review, any goal updates, and next review date.',
  };
}

/**
 * Rule: No progress note in 30+ days for an active client
 */
export function ruleNoRecentNote(data, clientId) {
  if (data.client?.status !== 'active') return null;
  const notes = data.progressNotes ?? [];
  if (notes.length === 0) {
    return buildNoNoteRec(clientId, null, 'No progress notes on file for this active client.');
  }
  const sorted = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const latest = sorted[0];
  const days = daysSince(latest.createdAt);
  if (days < 30) return null;
  return buildNoNoteRec(clientId, days, `No progress note in ${days} days.`);
}

function buildNoNoteRec(clientId, days, summary) {
  return {
    id: `rule_clinical_no_recent_note:${clientId}`,
    ruleId: 'rule_clinical_no_recent_note',
    category: 'clinical_caution',
    title: days ? `No Progress Note in ${days} Days` : 'No Progress Notes on File',
    summary,
    rationale: `Active clients should have regular progress documentation. ${days ? `The last note was ${days} days ago, exceeding the standard 30-day documentation expectation.` : 'No progress notes exist for this client.'} Documentation gaps can create compliance issues and limit clinical continuity.`,
    evidence: [
      days ? `Last note: ${days} days ago` : 'No notes found',
      `Client status: active`,
    ],
    priority: 6,
    confidence: 1.0,
    cautions: [],
    actions: ['generate_note_prep', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Complete a progress note for the most recent session if not yet documented.',
  };
}

/**
 * Rule: Active diagnosis with no corresponding treatment goal
 */
export function ruleDiagnosisWithoutGoal(data, clientId) {
  const diagnoses = data.diagnoses ?? [];
  const goals = data.treatmentPlan?.goals ?? [];
  if (diagnoses.length === 0 || !data.treatmentPlan) return null;

  const goalText = goals.map((g) => (g.description ?? '').toLowerCase()).join(' ');
  const unaddressed = diagnoses.filter((dx) => {
    // Simple heuristic: check if any goal text mentions the condition family
    const dxWords = (dx.description ?? '').toLowerCase().split(/\s+/);
    return !dxWords.some((word) => word.length > 4 && goalText.includes(word));
  });

  if (unaddressed.length === 0) return null;
  const dxList = unaddressed.map((dx) => `${dx.code} ${dx.description}`).join('; ');

  return {
    id: `rule_clinical_dx_without_goal:${clientId}`,
    ruleId: 'rule_clinical_dx_without_goal',
    category: 'clinical_caution',
    title: 'Diagnosis Without Corresponding Treatment Goal',
    summary: `${unaddressed.length} diagnosis/diagnoses appear to have no corresponding treatment goal: ${dxList}.`,
    rationale: `Every active diagnosis should have at least one treatment goal that addresses the presenting concern. Goals without a linked diagnosis suggest the treatment plan may be incomplete. This may affect clinical effectiveness, documentation quality, and insurance compliance.`,
    evidence: [
      `Unaddressed diagnosis: ${dxList}`,
      `Current goals: ${goals.length}`,
    ],
    priority: 7,
    confidence: 0.75,
    cautions: [
      'This is a heuristic match — counselor should confirm whether goals address each diagnosis.',
    ],
    actions: ['create_treatment_plan_update', 'generate_session_agenda'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Add or update treatment goals to reflect each active diagnosis.',
  };
}
