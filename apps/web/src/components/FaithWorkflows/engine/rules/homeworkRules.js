/**
 * Homework / Between-Session Support Rules
 *
 * - No homework assigned in last 2 completed sessions
 * - PHQ or GAD elevated → suggest journaling
 */

import { getLatestAssessmentScore, lastNCompletedSessions } from '../utils.js';

/**
 * Rule: No between-session homework in the last 2 completed sessions
 */
export function ruleNoRecentHomework(data, clientId) {
  const notes = data.progressNotes ?? [];
  const recent = lastNCompletedSessions(data.appointments, notes, 2);
  if (recent.length < 2) return null;

  // Check if any notes for those sessions mention homework being assigned
  const homeworkKeywords = ['homework', 'assignment', 'practice', 'worksheet', 'journal', 'thought record', 'between session'];
  const hasHomework = recent.some((note) => {
    if (!note) return false;
    const text = ((note.summary ?? '') + ' ' + (note.interventions ?? '')).toLowerCase();
    return homeworkKeywords.some((kw) => text.includes(kw));
  });

  if (hasHomework) return null;

  return {
    id: `rule_homework_no_between_session:${clientId}`,
    ruleId: 'rule_homework_no_between_session',
    category: 'homework',
    title: 'No Between-Session Homework in Last 2 Sessions',
    summary: 'No between-session homework appears to have been assigned in the last 2 completed sessions. Between-session practice is a core component of effective therapy.',
    rationale: 'Evidence-based therapies (CBT, DBT, ACT) derive significant benefit from between-session practice. When homework is consistently absent, skill generalization and progress may be slower. Consider introducing a brief, low-barrier assignment — a thought record, journaling prompt, or grounding exercise.',
    evidence: [
      'Last 2 session notes reviewed — no homework assignment language detected',
    ],
    priority: 4,
    confidence: 0.85,
    cautions: [
      'Homework should be collaborative — ensure client has capacity and interest.',
    ],
    actions: ['create_cbt_exercise', 'create_journal_prompt', 'generate_session_agenda'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document homework assigned, rationale, and client agreement.',
  };
}

/**
 * Rule: PHQ-9 or GAD-7 elevated → suggest journaling as between-session support
 */
export function ruleJournalSuggestion(data, clientId) {
  const phq = getLatestAssessmentScore(data.assessments, 'PHQ-9');
  const gad = getLatestAssessmentScore(data.assessments, 'GAD-7');
  if ((phq ?? 0) < 10 && (gad ?? 0) < 10) return null;

  const elevatedStr = [
    phq >= 10 ? `PHQ-9 = ${phq}` : null,
    gad >= 10 ? `GAD-7 = ${gad}` : null,
  ].filter(Boolean).join(', ');

  return {
    id: `rule_homework_journal:${clientId}`,
    ruleId: 'rule_homework_journal',
    category: 'homework',
    title: 'Journaling Prompt Recommended',
    summary: `Elevated mood/anxiety scores (${elevatedStr}) suggest structured journaling may help the client track patterns between sessions.`,
    rationale: `With ${elevatedStr}, structured between-session journaling can help the client develop self-awareness, identify triggers, and bring richer material to sessions. Prompts can be tailored to cognitive-behavioral themes (thought records, behavioral activation logs) or, if appropriate, gratitude and reflection prompts with a faith dimension.`,
    evidence: [
      elevatedStr,
    ],
    priority: 3,
    confidence: 0.80,
    cautions: [],
    actions: ['create_journal_prompt', 'generate_session_agenda'],
    faithNote: data.faithProfile?.integratesFaith
      ? 'Consider a faith-integrated journaling prompt (gratitude, Scripture reflection, or prayer journaling) if the client finds this meaningful.'
      : null,
    status: 'pending',
    orderedAfter: `rule_homework_no_between_session:${clientId}`,
    docNote: 'Document journaling assignment and any faith-integration discussion.',
  };
}
