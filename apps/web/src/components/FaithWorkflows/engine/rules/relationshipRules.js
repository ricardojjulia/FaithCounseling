/**
 * Relationship / Family / Systems Rules
 *
 * - Couples/family therapy diagnosis without systems goal
 * - Progress note mentions family/partner concern without follow-up plan
 * - Appointment type is couples/family but no systemic goal in treatment plan
 */

/**
 * Rule: Couples or family therapy in appointment types but no systemic treatment goal
 */
export function ruleSystemsGoalMissing(data, clientId) {
  const systemsApptTypes = ['couples_therapy', 'family_therapy'];
  const hasFamilyAppt = (data.appointments ?? []).some(
    (a) => systemsApptTypes.includes(a.appointmentType ?? a.type ?? ''),
  );
  if (!hasFamilyAppt) return null;

  const goals = data.treatmentPlan?.goals ?? [];
  const systemsKeywords = ['partner', 'spouse', 'couple', 'family', 'communication', 'relationship', 'marriage'];
  const hasSystemsGoal = goals.some((g) =>
    systemsKeywords.some((kw) => (g.description ?? '').toLowerCase().includes(kw)),
  );
  if (hasSystemsGoal) return null;

  return {
    id: `rule_relationship_no_systems_goal:${clientId}`,
    ruleId: 'rule_relationship_no_systems_goal',
    category: 'relationship',
    title: 'Couples/Family Therapy — No Systemic Goal Found',
    summary: 'Client has had couples or family therapy sessions, but no relationship/systemic goal is present in the treatment plan.',
    rationale: 'When couples or family therapy sessions are occurring, the treatment plan should reflect relational or systemic goals (e.g., improve communication, reduce conflict, establish healthy boundaries). Without these, progress tracking is incomplete.',
    evidence: [
      'Couples/family appointment type found in session history',
      'No relationship/systemic goal found in treatment plan',
    ],
    priority: 4,
    confidence: 0.80,
    cautions: [],
    actions: ['create_treatment_plan_update', 'generate_session_agenda'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Add or update treatment goals to reflect systemic/relational treatment focus.',
  };
}

/**
 * Rule: Recent note mentions family/partner concern — ensure follow-up plan
 */
export function ruleRelationshipConcernInNote(data, clientId) {
  const familyKeywords = ['partner', 'spouse', 'marriage', 'divorce', 'family conflict', 'family tension', 'parent', 'child custody', 'estranged'];
  const notes = [...(data.progressNotes ?? [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const recentNote = notes[0];
  if (!recentNote) return null;

  const text = ((recentNote.summary ?? '') + ' ' + (recentNote.interventions ?? '')).toLowerCase();
  const matchedKeyword = familyKeywords.find((kw) => text.includes(kw));
  if (!matchedKeyword) return null;

  return {
    id: `rule_relationship_note_concern:${clientId}`,
    ruleId: 'rule_relationship_note_concern',
    category: 'relationship',
    title: 'Relationship/Family Concern in Recent Note',
    summary: `The most recent session note mentions a relationship or family concern. Ensure a follow-up plan addresses this.`,
    rationale: `The most recent progress note appears to reference a relationship or family-related concern ("${matchedKeyword}"). Unaddressed relational stressors can maintain or worsen clinical symptoms. Consider whether this warrants a treatment goal, a referral for couples/family therapy, or explicit session focus.`,
    evidence: [
      `Note dated: ${recentNote.createdAt ? new Date(recentNote.createdAt).toLocaleDateString() : 'unknown'}`,
      `Keyword detected: "${matchedKeyword}"`,
    ],
    priority: 4,
    confidence: 0.70,
    cautions: [
      'This is a keyword-based heuristic — confirm relevance in the note context.',
    ],
    actions: ['generate_session_agenda', 'create_treatment_plan_update'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document whether relationship concern was addressed and any plan for ongoing support.',
  };
}
