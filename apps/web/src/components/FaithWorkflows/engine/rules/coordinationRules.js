/**
 * Coordination / Admin Rules
 *
 * - Insurance not on file for an active client
 * - Open referral with no follow-up note
 * - Church/faith referral coordination available (if faith profile)
 */

import { daysSince } from '../utils.js';

/**
 * Rule: No insurance on file for an active client
 */
export function ruleNoInsurance(data, clientId) {
  if (data.client?.status !== 'active') return null;
  // insurance field may be null, empty array, or missing
  const hasInsurance = data.insurance && (Array.isArray(data.insurance) ? data.insurance.length > 0 : true);
  if (hasInsurance) return null;

  return {
    id: `rule_coordination_no_insurance:${clientId}`,
    ruleId: 'rule_coordination_no_insurance',
    category: 'coordination',
    title: 'Insurance Not on File',
    summary: 'No insurance information is on file for this active client. Update billing records to ensure accurate claims and coverage verification.',
    rationale: 'Active clients receiving ongoing treatment should have current insurance information on file for billing, prior authorization, and benefits verification purposes. Missing insurance data may delay claims or indicate a private-pay arrangement that should be documented.',
    evidence: [
      'No insurance record found',
      `Client status: active`,
    ],
    priority: 3,
    confidence: 1.0,
    cautions: [],
    actions: ['add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Update insurance information or document private-pay arrangement.',
  };
}

/**
 * Rule: Open referral with no follow-up in > 21 days
 */
export function ruleOpenReferral(data, clientId) {
  const referrals = data.referrals ?? [];
  const stale = referrals.filter((r) => {
    if (r.status === 'completed' || r.status === 'closed') return false;
    return daysSince(r.createdAt ?? r.referralDate) > 21;
  });
  if (stale.length === 0) return null;

  const names = stale.map((r) => r.referralType ?? r.type ?? 'Referral').join(', ');
  return {
    id: `rule_coordination_open_referral:${clientId}`,
    ruleId: 'rule_coordination_open_referral',
    category: 'coordination',
    title: `${stale.length} Open Referral${stale.length > 1 ? 's' : ''} Without Follow-up`,
    summary: `${stale.length} referral${stale.length > 1 ? 's' : ''} with no follow-up note in > 21 days: ${names}.`,
    rationale: `Referrals require follow-through to ensure clients received the recommended services. Without follow-up documentation, care coordination gaps can develop. A brief follow-up note or reminder is recommended.`,
    evidence: stale.map((r) => `${r.referralType ?? 'Referral'} — ${daysSince(r.createdAt ?? r.referralDate)} days open`),
    priority: 4,
    confidence: 0.90,
    cautions: [],
    actions: ['draft_followup_message', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document referral follow-up status and any coordination notes.',
  };
}

/**
 * Rule: Faith profile present + faith referral coordination available (optional)
 */
export function ruleFaithReferralAvailable(data, clientId) {
  const fp = data.faithProfile;
  if (!fp || !fp.integratesFaith) return null;
  // Only fire if client has faith tradition and a referral network could be relevant
  if (!fp.tradition) return null;

  return {
    id: `rule_coordination_faith_referral:${clientId}`,
    ruleId: 'rule_coordination_faith_referral',
    category: 'coordination',
    title: 'Faith Community Referral Available (Optional)',
    summary: 'Client has a faith profile with integration opted in. A referral to church pastoral care, small group, or faith community support may supplement clinical care.',
    rationale: `For faith-integrated clients, pastoral care, church support groups, or community mentorship can provide between-session support that complements clinical treatment. This is a coordination option — not a replacement for clinical care. Referral should be collaborative and client-initiated.`,
    evidence: [
      `Faith tradition: ${fp.tradition.replace(/_/g, ' ')}`,
      'Faith integration opted in',
    ],
    priority: 2,
    confidence: 0.65,
    cautions: [
      'OPTIONAL: Only pursue if client expresses interest in faith community involvement.',
      'Pastoral care does not replace clinical counseling.',
      'Document any referrals made and the client\'s response.',
    ],
    actions: ['add_reminder_task', 'draft_followup_message'],
    faithNote: 'Consider connecting client with pastor, small group, or prayer partner if the client desires.',
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document any faith community referral discussion and client preferences.',
  };
}

/**
 * Rule: Discharge candidate — closing summary note recommended
 */
export function ruleClosingSummaryNeeded(data, clientId) {
  const goals = data.treatmentPlan?.goals ?? [];
  if (goals.length === 0) return null;
  const allMet = goals.every((g) => g.status === 'completed');
  if (!allMet) return null;

  // Check if a discharge note exists
  const hasDischargeNote = (data.progressNotes ?? []).some((n) => n.noteType === 'discharge_note');
  if (hasDischargeNote) return null;

  return {
    id: `rule_coordination_closing_summary:${clientId}`,
    ruleId: 'rule_coordination_closing_summary',
    category: 'coordination',
    title: 'Closing Summary Note Recommended',
    summary: 'All treatment goals are met. A discharge/closing summary note should be completed to document treatment outcomes.',
    rationale: 'When all treatment goals are met, a formal discharge summary documents the clinical journey, treatment outcomes, and post-discharge recommendations. This is important for continuity of care, legal/compliance records, and future clinical reference.',
    evidence: [
      `All ${goals.length} treatment goals marked complete`,
      'No discharge note found on record',
    ],
    priority: 3,
    confidence: 0.90,
    cautions: [],
    actions: ['generate_note_prep', 'add_reminder_task'],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'Complete discharge summary including presenting concerns, treatment summary, outcomes, and after-care plan.',
  };
}
