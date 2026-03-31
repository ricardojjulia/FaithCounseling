/**
 * Session Focus Rules
 *
 * - Overdue treatment goal (target date passed, not completed)
 * - Pending/incomplete homework assignment
 * - Pending unscored assessment
 */

import { daysSince } from '../utils.js';

/**
 * Rule: One or more treatment goals with passed target dates
 */
export function ruleOverdueGoals(data, clientId) {
  const goals = data.treatmentPlan?.goals ?? [];
  const overdue = goals.filter((g) => {
    if (!g.targetDate) return false;
    if (g.status === 'completed') return false;
    return new Date(g.targetDate) < new Date();
  });
  if (overdue.length === 0) return null;

  const names = overdue.map((g) => `"${g.description}"`).join(', ');
  return {
    id: `rule_session_goal_overdue:${clientId}`,
    ruleId: 'rule_session_goal_overdue',
    category: 'session_focus',
    title: `${overdue.length} Overdue Treatment Goal${overdue.length > 1 ? 's' : ''}`,
    summary: `${overdue.length} treatment goal${overdue.length > 1 ? 's have' : ' has'} passed target date without completion: ${names}.`,
    rationale: `Goals that have passed their target dates without completion suggest a need to review progress, revise timelines, or adjust interventions. This is a natural agenda item for an upcoming session — either to celebrate near-completion or to recalibrate.`,
    evidence: overdue.map((g) => `"${g.description}" — target: ${g.targetDate ? new Date(g.targetDate).toLocaleDateString() : 'unknown'}`),
    priority: 5,
    confidence: 0.90,
    cautions: [],
    actions: ['generate_session_agenda', 'create_treatment_plan_update', 'generate_note_prep'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document goal review and any revisions to target dates or intervention plans.',
  };
}

/**
 * Rule: Pending homework that has not been submitted
 */
export function rulePendingHomework(data, clientId) {
  const pending = (data.homeworkPending ?? []).filter((hw) => !hw.submittedAt);
  if (pending.length === 0) return null;

  const names = pending.map((hw) => `"${hw.title}"`).join(', ');
  const oldest = pending.reduce((a, b) => new Date(a.assignedAt) < new Date(b.assignedAt) ? a : b);
  const daysOld = daysSince(oldest.assignedAt);

  return {
    id: `rule_session_homework_incomplete:${clientId}`,
    ruleId: 'rule_session_homework_incomplete',
    category: 'session_focus',
    title: `${pending.length} Incomplete Homework Assignment${pending.length > 1 ? 's' : ''}`,
    summary: `Client has ${pending.length} unsubmitted homework assignment${pending.length > 1 ? 's' : ''}: ${names}. Oldest assigned ${daysOld} days ago.`,
    rationale: `Between-session homework is a key component of evidence-based therapies like CBT. Unsubmitted assignments may indicate barriers to engagement, difficulty with the task, or avoidance. Address in session to explore what got in the way and adjust if needed.`,
    evidence: [
      `Pending assignments: ${names}`,
      `Oldest unsubmitted: ${daysOld} days`,
    ],
    priority: 5,
    confidence: 1.0,
    cautions: [],
    actions: ['generate_session_agenda', 'create_cbt_exercise'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document homework review, any barriers identified, and revised or new assignments.',
  };
}

/**
 * Rule: Assigned assessment not yet completed
 */
export function rulePendingAssessment(data, clientId) {
  const pending = (data.assessments ?? []).filter(
    (a) => a.status === 'assigned' && !a.completedAt && !a.scoredAt,
  );
  if (pending.length === 0) return null;

  const names = pending.map((a) => a.inventoryName ?? a.title ?? a.id).join(', ');
  return {
    id: `rule_session_assessment_pending:${clientId}`,
    ruleId: 'rule_session_assessment_pending',
    category: 'session_focus',
    title: `${pending.length} Pending Assessment${pending.length > 1 ? 's' : ''}`,
    summary: `${pending.length} assigned assessment${pending.length > 1 ? 's have' : ' has'} not been completed: ${names}.`,
    rationale: `Pending assessments delay important clinical data needed for treatment planning and outcome monitoring. Consider completing these at the start of the next session or requesting pre-session completion.`,
    evidence: [
      `Pending: ${names}`,
    ],
    priority: 4,
    confidence: 1.0,
    cautions: [],
    actions: ['generate_session_agenda', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document that assessments were completed or reschedule with reason.',
  };
}
