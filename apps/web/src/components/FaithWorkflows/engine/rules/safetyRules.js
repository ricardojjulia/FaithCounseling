/**
 * Safety Rules — highest-priority rules.
 *
 * Rules here fire for immediate escalation concerns:
 * - PHQ-9 severe (≥20)
 * - PHQ-9 item 9 suicidal ideation (score ≥2)
 * - PCL-5 crisis threshold (≥51)
 * - Consecutive no-shows (≥3 or ≥2 + high-touchpoint)
 * - Risk keywords in recent progress notes
 *
 * All safety recommendations have priority ≥ 9 and CANNOT be hidden or deferred.
 */

import { getLatestAssessment, getLatestAssessmentScore, consecutiveNoShows } from '../utils.js';

// Phrase/word keywords — safe to use substring match (each is distinctive enough)
const PHRASE_RISK_KEYWORDS = [
  'suicidal', 'suicide', 'self-harm', 'self harm', 'homicidal', 'homicide',
  'overdose', 'cutting', 'kill myself', 'end my life', 'hopeless', 'plan to die',
  'passive suicidal', 'active SI',
];

// Short abbreviations that must be matched as whole words to avoid false positives
// e.g. 'SI' would match 'assigned', 'consistent', 'transition' as a bare substring
const WORD_BOUNDARY_RISK_KEYWORDS = [
  /\bSI\b/i,
];

function containsRiskKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (PHRASE_RISK_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))) return true;
  return WORD_BOUNDARY_RISK_KEYWORDS.some((re) => re.test(text));
}

/**
 * Rule: PHQ-9 severe (score ≥ 20)
 * @param {import('../types.js').ClientWorkflowData} data
 * @param {string} clientId
 * @returns {import('../types.js').Recommendation|null}
 */
export function rulePhq9Severe(data, clientId) {
  const latest = getLatestAssessment(data.assessments, 'PHQ-9');
  if (!latest || latest.score == null || latest.score < 20) return null;

  const severityLabel = latest.score >= 27 ? 'extremely severe' : 'severe';
  return {
    id: `rule_safety_phq9_severe:${clientId}`,
    ruleId: 'rule_safety_phq9_severe',
    category: 'safety',
    title: 'PHQ-9 Severe — Immediate Review Required',
    summary: `Client's most recent PHQ-9 score is ${latest.score} (${severityLabel} range ≥20). Requires immediate clinical review and safety assessment.`,
    rationale: `PHQ-9 score of ${latest.score} exceeds the severe threshold of 20. Per best-practice guidelines, scores in the severe range require same-day or next-session review of safety, current functioning, and treatment adequacy. A score this high is associated with significant impairment and elevated risk.`,
    evidence: [
      `PHQ-9 score: ${latest.score} (severe range ≥20)`,
      `Scored: ${latest.scoredAt ? new Date(latest.scoredAt).toLocaleDateString() : 'unknown date'}`,
    ],
    priority: 10,
    confidence: 1.0,
    cautions: [
      'Do not defer or hide this recommendation — it requires direct counselor review.',
      'If client is unreachable, follow your practice\'s crisis outreach protocol.',
    ],
    actions: ['generate_note_prep', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document PHQ-9 score, clinical response, and any safety assessment performed.',
  };
}

/**
 * Rule: PHQ-9 item 9 suicidal ideation (score ≥ 2)
 * @param {import('../types.js').ClientWorkflowData} data
 * @param {string} clientId
 * @returns {import('../types.js').Recommendation|null}
 */
export function rulePhq9SuicidalIdeation(data, clientId) {
  const latest = getLatestAssessment(data.assessments, 'PHQ-9');
  if (!latest || latest.item9Score == null || latest.item9Score < 2) return null;

  const siLevel = latest.item9Score === 2 ? 'several days' : latest.item9Score === 3 ? 'nearly every day' : 'elevated';
  return {
    id: `rule_safety_phq9_si:${clientId}`,
    ruleId: 'rule_safety_phq9_si',
    category: 'safety',
    title: 'Suicidal Ideation Reported — Safety Plan Required',
    summary: `Client endorsed PHQ-9 item 9 with a score of ${latest.item9Score} ("${siLevel}"). A formal safety plan must be reviewed or created.`,
    rationale: `PHQ-9 item 9 asks about thoughts of being better off dead or hurting oneself. A score of ${latest.item9Score} indicates this client endorsed these thoughts "${siLevel}" in the past two weeks. This requires direct safety assessment, risk stratification, and safety plan documentation. Do not address this concern solely through spiritual encouragement.`,
    evidence: [
      `PHQ-9 item 9 score: ${latest.item9Score} / 3`,
      `Full PHQ-9 score: ${latest.score ?? 'N/A'}`,
      `Scored: ${latest.scoredAt ? new Date(latest.scoredAt).toLocaleDateString() : 'unknown'}`,
    ],
    priority: 10,
    confidence: 1.0,
    cautions: [
      'CRITICAL: Spiritual encouragement alone is never an appropriate response to active SI.',
      'If you cannot reach the client, follow your practice emergency protocol immediately.',
      'Document any safety plan discussion in this session\'s progress note.',
    ],
    actions: ['generate_note_prep', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: `rule_safety_phq9_severe:${clientId}`,
    docNote: 'Document safety assessment, risk level, safety plan review, and follow-up plan.',
  };
}

/**
 * Rule: PCL-5 crisis threshold (≥ 51)
 * @param {import('../types.js').ClientWorkflowData} data
 * @param {string} clientId
 * @returns {import('../types.js').Recommendation|null}
 */
export function rulePcl5High(data, clientId) {
  const latest = getLatestAssessment(data.assessments, 'PCL-5');
  if (!latest || latest.score == null || latest.score < 51) return null;

  return {
    id: `rule_safety_pcl5_high:${clientId}`,
    ruleId: 'rule_safety_pcl5_high',
    category: 'safety',
    title: 'PCL-5 Indicates Probable PTSD — Trauma Protocol Review',
    summary: `PCL-5 score of ${latest.score} meets the probable PTSD threshold (≥51). Review trauma safety and treatment appropriateness.`,
    rationale: `A PCL-5 score of ${latest.score} exceeds the provisional PTSD cutoff of 51. At this level, clients are at elevated risk for dissociation, emotional dysregulation, and avoidance behaviors that can interfere with safety. Ensure trauma-informed protocols are in place and that current treatment approach is appropriate for this severity.`,
    evidence: [
      `PCL-5 score: ${latest.score} (probable PTSD threshold: 51)`,
      `Scored: ${latest.scoredAt ? new Date(latest.scoredAt).toLocaleDateString() : 'unknown'}`,
    ],
    priority: 9,
    confidence: 0.90,
    cautions: [
      'Ensure trauma-informed safety protocols are in place before proceeding with exposure work.',
      'Consider trauma specialist consultation if not already engaged.',
    ],
    actions: ['generate_note_prep', 'create_treatment_plan_update', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document PCL-5 score, trauma safety status, and treatment modality review.',
  };
}

/**
 * Rule: Consecutive no-shows (≥ 2 for high-touchpoint, ≥ 3 for others)
 * @param {import('../types.js').ClientWorkflowData} data
 * @param {string} clientId
 * @returns {import('../types.js').Recommendation|null}
 */
export function ruleConsecutiveNoShows(data, clientId) {
  const count = consecutiveNoShows(data.appointments);
  const isHighTouchpoint = Boolean(data.client?.highTouchpoint);
  const threshold = isHighTouchpoint ? 2 : 3;
  if (count < threshold) return null;

  return {
    id: `rule_safety_no_show_series:${clientId}`,
    ruleId: 'rule_safety_no_show_series',
    category: 'safety',
    title: `${count} Consecutive No-Shows — Welfare Check`,
    summary: `Client has missed ${count} consecutive appointments without contact. A welfare check or outreach call is warranted.`,
    rationale: `${count} consecutive missed appointments may indicate a deteriorating mental health situation, crisis, or disengagement from care. For ${isHighTouchpoint ? 'high-touchpoint clients (threshold: 2 no-shows)' : 'clients (threshold: 3 no-shows)'}, this pattern warrants direct outreach before the next scheduled session. Document all outreach attempts.`,
    evidence: [
      `${count} consecutive no-shows recorded`,
      isHighTouchpoint ? 'Client is flagged as high-touchpoint' : null,
    ].filter(Boolean),
    priority: isHighTouchpoint ? 9 : 8,
    confidence: 0.95,
    cautions: [
      'Follow your practice\'s welfare check protocol.',
      'Document all outreach attempts and outcomes.',
    ],
    actions: ['draft_followup_message', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document outreach attempts, responses, and clinical rationale for continued engagement or discharge.',
  };
}

/**
 * Rule: Risk-related keyword in most recent progress note
 * @param {import('../types.js').ClientWorkflowData} data
 * @param {string} clientId
 * @returns {import('../types.js').Recommendation|null}
 */
export function ruleRiskKeywordInNote(data, clientId) {
  const sortedNotes = [...(data.progressNotes ?? [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const recentNote = sortedNotes[0];
  if (!recentNote) return null;

  const hasRisk = containsRiskKeyword(recentNote.summary)
    || containsRiskKeyword(recentNote.interventions);
  if (!hasRisk) return null;

  return {
    id: `rule_safety_risk_note:${clientId}`,
    ruleId: 'rule_safety_risk_note',
    category: 'safety',
    title: 'Risk Language in Recent Note — Review',
    summary: 'The most recent progress note contains risk-related language. Confirm safety status was addressed and documented.',
    rationale: 'The most recent progress note contains language associated with safety concerns (e.g., suicidal ideation, self-harm, hopelessness). This flag is generated client-side from note text and requires counselor review. If safety was already addressed, mark this recommendation complete.',
    evidence: [
      `Note dated: ${recentNote.createdAt ? new Date(recentNote.createdAt).toLocaleDateString() : 'unknown'}`,
      'Risk-related language detected in note summary',
    ],
    priority: 9,
    confidence: 0.80,
    cautions: [
      'This is a keyword-based flag, not a clinical determination.',
      'Counselor must confirm whether safety was addressed in that session.',
    ],
    actions: ['generate_note_prep', 'add_reminder_task', 'mark_complete'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Review note for safety documentation. If safety was addressed, add a follow-up note confirming status.',
  };
}
