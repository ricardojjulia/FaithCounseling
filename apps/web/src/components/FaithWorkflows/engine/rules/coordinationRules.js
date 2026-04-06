/**
 * Coordination / Admin Rules
 *
 * - Gift giving arrangement not documented (this practice operates by gift/donation only)
 * - Open referral with no follow-up note
 * - Church/faith referral coordination available (if faith profile)
 */

import { daysSince } from '../utils.js';

/**
 * Rule: No gift/financial arrangement note on file for an active client
 *
 * This practice operates on a gift-giving model (no insurance billing).
 * A documented gift arrangement or financial understanding should be on file
 * for each active client to ensure transparency and appropriate expectations.
 */
export function ruleGiftArrangementNote(data, clientId) {
  if (data.client?.status !== 'active') return null;
  // Check for a documented gift/financial arrangement note or flag
  const hasGiftNote = data.client?.giftArrangementNoted
    || data.client?.financialArrangementNoted
    || (data.progressNotes ?? []).some((n) => n.noteType === 'financial_arrangement' || (n.tags ?? []).includes('gift_arrangement'));
  if (hasGiftNote) return null;

  return {
    id: `rule_coordination_gift_arrangement:${clientId}`,
    ruleId: 'rule_coordination_gift_arrangement',
    category: 'coordination',
    title: 'Gift Arrangement Not Documented',
    summary: 'This practice operates on a gift-giving model. No gift or financial arrangement note has been documented for this active client.',
    rationale: 'As a gift-giving practice, the financial understanding between counselor and client should be clearly documented to maintain transparency, appropriate expectations, and compliance with the practice\'s operating model. A brief note confirming the gift arrangement or any giving discussion ensures the record is complete.',
    evidence: [
      'No gift arrangement or financial note found in client record',
      `Client status: active`,
    ],
    priority: 3,
    confidence: 1.0,
    cautions: [
      'This practice does not bill insurance. Gift giving is voluntary and should never be coerced.',
      'Document the nature of the arrangement, not any specific amounts.',
    ],
    actions: ['add_reminder_task'],
    faithNote: 'Stewardship and generosity are biblical values. A brief, grace-filled conversation about the giving model honors both parties.',
    status: 'pending',
    orderedAfter: null,
    docNote: 'Add a coordination note confirming the gift-giving arrangement was discussed and understood.',
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
