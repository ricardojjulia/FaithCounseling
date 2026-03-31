/**
 * Spiritual / Faith Integration Rules — ALL OPTIONAL
 *
 * SAFETY INVARIANTS (enforced here and at the renderer level):
 * 1. All spiritual recommendations are labeled optional.
 * 2. No spiritual recommendation can have priority > 4.
 * 3. Spiritual encouragement is NEVER a substitute for safety protocols.
 * 4. Rules only fire if the client has a faith profile AND integratesFaith = true,
 *    OR if the client has explicitly opted in elsewhere.
 * 5. No spiritual content is generated for clients with no faith profile.
 * 6. No language implies that symptoms are caused by weak faith.
 */

/**
 * Rule: Client has faith profile with biblical integration opted in
 */
export function ruleBiblicalIntegration(data, clientId) {
  const fp = data.faithProfile;
  if (!fp || !fp.integratesFaith) return null;

  return {
    id: `rule_spiritual_biblical_integration:${clientId}`,
    ruleId: 'rule_spiritual_biblical_integration',
    category: 'spiritual',
    title: 'Biblical Integration Available (Optional)',
    summary: 'Client has opted into faith integration. Consider incorporating Scripture, prayer, or faith-themed exercises if clinically appropriate and client-desired.',
    rationale: `This client (${fp.tradition ? fp.tradition.replace(/_/g, ' ') : 'faith background noted'}) has indicated interest in faith integration. Research suggests that faith integration in therapy can improve outcomes for clients who value it. This is a counselor-facilitated option — always follow the client's lead and never impose spiritual content.`,
    evidence: [
      `Faith tradition: ${fp.tradition ? fp.tradition.replace(/_/g, ' ') : 'noted'}`,
      'Client opted into faith integration',
      fp.notes ? `Client notes: "${fp.notes}"` : null,
    ].filter(Boolean),
    priority: 3,
    confidence: 0.80,
    cautions: [
      'OPTIONAL: Only incorporate if client initiates or confirms desire in session.',
      'Never suggest symptoms are caused by lack of faith or spiritual deficit.',
      'Spiritual care supplements, never replaces, evidence-based clinical intervention.',
    ],
    actions: ['suggest_verses', 'create_prayer_prompt', 'create_journal_prompt'],
    faithNote: 'Faith integration should be client-led. Ask before introducing spiritual content each session.',
    status: 'pending',
    orderedAfter: null,
    docNote: 'If faith integration is used, document that it was client-initiated or confirmed, and the specific content used.',
  };
}

/**
 * Rule: Client has grief-related diagnosis + faith profile → faith-based grief support
 */
export function ruleFaithBasedGriefSupport(data, clientId) {
  const fp = data.faithProfile;
  if (!fp || !fp.integratesFaith) return null;

  const griefCodes = ['F43.21', 'F43.22', 'F43.23', 'F43.24', 'F43.29', 'Z63.4'];
  const hasGrief = (data.diagnoses ?? []).some(
    (dx) => griefCodes.includes(dx.code) || (dx.description ?? '').toLowerCase().includes('grief') || (dx.description ?? '').toLowerCase().includes('bereavement'),
  );
  if (!hasGrief) return null;

  return {
    id: `rule_spiritual_grief:${clientId}`,
    ruleId: 'rule_spiritual_grief',
    category: 'spiritual',
    title: 'Faith-Based Grief Support Available (Optional)',
    summary: 'Client has a grief/bereavement diagnosis and has opted into faith integration. Faith-based grief resources may be meaningful to explore.',
    rationale: `For clients navigating grief who value their faith, integrating spiritual frameworks around lament, hope, and community support can be a meaningful complement to clinical grief work. This recommendation is offered as an optional pastoral-clinical bridge — not as a replacement for structured grief therapy.`,
    evidence: [
      'Grief/bereavement diagnosis on record',
      `Faith tradition: ${fp.tradition ? fp.tradition.replace(/_/g, ' ') : 'noted'}`,
    ],
    priority: 2,
    confidence: 0.70,
    cautions: [
      'OPTIONAL: Do not assume faith involvement will be comforting for every grieving client.',
      'Some clients experience complicated grief involving anger at God — approach with openness.',
      'This does not replace structured grief therapy (e.g., Prolonged Grief Disorder treatment).',
    ],
    actions: ['suggest_verses', 'create_prayer_prompt', 'create_journal_prompt'],
    faithNote: 'Themes of lament (e.g., Psalms of lament), hope, and resurrection may resonate — follow the client\'s lead.',
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document whether faith-based grief resources were discussed and client\'s response.',
  };
}

/**
 * Rule: Client is on a discharge trajectory + has faith profile → transition/blessing prayer
 */
export function ruleFaithTransitionSupport(data, clientId) {
  const fp = data.faithProfile;
  if (!fp || !fp.integratesFaith) return null;

  const goals = data.treatmentPlan?.goals ?? [];
  if (goals.length === 0) return null;
  const allMet = goals.length > 0 && goals.every((g) => g.status === 'completed');
  if (!allMet) return null;

  return {
    id: `rule_spiritual_transition:${clientId}`,
    ruleId: 'rule_spiritual_transition',
    category: 'spiritual',
    title: 'Faith-Based Transition Support Available (Optional)',
    summary: 'As client approaches treatment completion, a closing ritual (prayer of blessing, reflective exercise) may be meaningful if desired.',
    rationale: `Marking the end of a therapeutic journey intentionally can support integration of growth. For faith-integrated clients approaching discharge, a closing prayer, Scripture of blessing, or reflective faith exercise may provide meaningful closure — if the client wishes.`,
    evidence: [
      `All ${goals.length} treatment goals marked complete`,
      `Faith integration opted in`,
    ],
    priority: 1,
    confidence: 0.60,
    cautions: [
      'OPTIONAL: Only if client requests or expresses openness.',
      'Some clients prefer secular closure — respect preferences.',
    ],
    actions: ['create_prayer_prompt', 'suggest_verses'],
    faithNote: 'A closing prayer or blessing, Philippians 4:7, or Benediction passage may be appropriate if the client desires.',
    status: 'pending',
    orderedAfter: null,
    docNote: 'Document closing session content and any faith elements incorporated at client request.',
  };
}

/**
 * Rule: Faith profile exists but no integration opted in — acknowledge, don't push
 */
export function ruleFaithAcknowledge(data, clientId) {
  const fp = data.faithProfile;
  if (!fp) return null;
  if (fp.integratesFaith) return null; // Already handled by other rules

  return {
    id: `rule_spiritual_acknowledge:${clientId}`,
    ruleId: 'rule_spiritual_acknowledge',
    category: 'spiritual',
    title: 'Faith Background on File — No Integration Requested (Optional)',
    summary: `Client has a faith background noted (${fp.tradition ? fp.tradition.replace(/_/g, ' ') : 'undeclared'}) but has not opted into faith integration. Revisit periodically if appropriate.`,
    rationale: 'Client preferences around faith integration can evolve. Periodically checking in (without pressure) on whether the client would find faith-integrated support meaningful is appropriate. Never assume — always ask.',
    evidence: [
      `Faith tradition: ${fp.tradition ? fp.tradition.replace(/_/g, ' ') : 'on file'}`,
      'Faith integration: not opted in',
    ],
    priority: 1,
    confidence: 0.50,
    cautions: [
      'OPTIONAL: Do not introduce spiritual content without client initiation or explicit consent.',
      'Faith integration is client-led, not counselor-directed.',
    ],
    actions: [],
    faithNote: null,
    status: 'pending',
    orderedAfter: null,
    docNote: 'If client preferences change regarding faith integration, update faith profile accordingly.',
  };
}
