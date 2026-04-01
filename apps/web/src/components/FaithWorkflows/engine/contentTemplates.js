/**
 * Static content templates for Faithful Workflows action outputs.
 *
 * These render deterministic, counselor-reviewable drafts from rule data.
 * No LLM is called here — all output is template-interpolated from structured
 * recommendation data already visible in the UI.
 *
 * All rendered strings must be treated as drafts requiring counselor review
 * before clinical use.
 */

export const AI_DISCLAIMER = '⚠ AI-assisted draft — final judgment belongs to the counselor';

// ─── Session agenda ──────────────────────────────────────────────────────────

/**
 * Build a plain-text session agenda from a client's pending recommendations.
 * @param {string} clientName
 * @param {import('./types.js').Recommendation[]} recommendations  — all recs, sorted
 * @returns {string}
 */
export function renderSessionAgenda(clientName, recommendations) {
  const pending = recommendations.filter((r) => r.status === 'pending' || r.status === 'deferred');
  if (!pending.length) {
    return `Session Agenda — ${clientName}\n\nNo open workflow items. Review treatment plan and client goals at start of session.\n\n${AI_DISCLAIMER}`;
  }

  const lines = [`Session Agenda — ${clientName}`, ''];

  const byCategory = {};
  for (const rec of pending) {
    if (!byCategory[rec.category]) byCategory[rec.category] = [];
    byCategory[rec.category].push(rec);
  }

  const CATEGORY_LABELS = {
    safety:            'Safety / Escalation',
    clinical_caution:  'Clinical Cautions',
    session_focus:     'Session Focus',
    homework:          'Homework Review',
    relationship:      'Relationship / Family',
    spiritual:         'Spiritual Care (Optional)',
    coordination:      'Coordination',
    monitoring:        'Monitoring',
  };

  for (const [cat, recs] of Object.entries(byCategory)) {
    lines.push(`## ${CATEGORY_LABELS[cat] ?? cat}`);
    for (const rec of recs) {
      lines.push(`- ${rec.title}`);
      if (rec.summary) lines.push(`  ${rec.summary}`);
    }
    lines.push('');
  }

  lines.push(AI_DISCLAIMER);
  return lines.join('\n');
}

// ─── Note prep ───────────────────────────────────────────────────────────────

/**
 * Render a progress note preparation prompt from a single recommendation.
 * Uses the recommendation's docNote field if present, otherwise builds from evidence.
 * @param {import('./types.js').Recommendation} rec
 * @returns {string}
 */
export function renderNotePrep(rec) {
  const lines = [
    `Progress Note Prep — ${rec.title}`,
    '',
    'Documentation considerations:',
  ];

  if (rec.docNote) {
    lines.push(rec.docNote);
  } else {
    lines.push(`Document clinical response to: ${rec.summary}`);
  }

  if (rec.evidence?.length) {
    lines.push('');
    lines.push('Supporting evidence:');
    for (const e of rec.evidence) {
      lines.push(`  • ${e}`);
    }
  }

  if (rec.cautions?.length) {
    lines.push('');
    lines.push('Cautions:');
    for (const c of rec.cautions) {
      lines.push(`  ⚠ ${c}`);
    }
  }

  lines.push('');
  lines.push(AI_DISCLAIMER);
  return lines.join('\n');
}

// ─── Bible verse suggestions ─────────────────────────────────────────────────

const VERSE_MAP = {
  safety: [
    { ref: 'Psalm 34:18', text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.' },
    { ref: 'Isaiah 41:10', text: 'So do not fear, for I am with you; do not be dismayed, for I am your God.' },
    { ref: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
  ],
  clinical_caution: [
    { ref: 'Jeremiah 29:11', text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."' },
    { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him.' },
    { ref: 'Philippians 4:6–7', text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.' },
  ],
  session_focus: [
    { ref: 'Proverbs 3:5–6', text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.' },
    { ref: 'Lamentations 3:22–23', text: 'Because of the Lord\'s great love we are not consumed, for his compassions never fail. They are new every morning.' },
  ],
  homework: [
    { ref: 'Psalm 119:11', text: 'I have hidden your word in my heart that I might not sin against you.' },
    { ref: 'Joshua 1:8', text: 'Keep this Book of the Law always on your lips; meditate on it day and night.' },
  ],
  relationship: [
    { ref: 'Colossians 3:13', text: 'Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.' },
    { ref: 'Ephesians 4:32', text: 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.' },
  ],
  spiritual: [
    { ref: 'John 14:27', text: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.' },
    { ref: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
    { ref: '2 Corinthians 12:9', text: '"My grace is sufficient for you, for my power is made perfect in weakness."' },
  ],
  coordination: [
    { ref: 'Proverbs 15:22', text: 'Plans fail for lack of counsel, but with many advisers they succeed.' },
  ],
  monitoring: [
    { ref: 'Philippians 1:6', text: 'Being confident of this, that he who began a good work in you will carry it on to completion until the day of Christ Jesus.' },
    { ref: 'Isaiah 40:31', text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.' },
  ],
};

/**
 * Return verse suggestions for a recommendation's category.
 * @param {import('./types.js').Recommendation} rec
 * @returns {string}
 */
export function renderVerseSuggestions(rec) {
  const verses = VERSE_MAP[rec.category] ?? VERSE_MAP.spiritual;
  const lines = [
    `Scripture Suggestions — ${rec.title}`,
    '',
    'These verses may offer comfort or reflection relevant to this care area.',
    'Share only with clients who have opted into faith integration.',
    '',
  ];
  for (const v of verses) {
    lines.push(`${v.ref}`);
    lines.push(`"${v.text}"`);
    lines.push('');
  }
  lines.push(AI_DISCLAIMER);
  return lines.join('\n');
}

// ─── Prayer prompt ───────────────────────────────────────────────────────────

/**
 * Render a brief, non-prescriptive prayer prompt for a spiritual care recommendation.
 * @param {import('./types.js').Recommendation} rec
 * @returns {string}
 */
export function renderPrayerPrompt(rec) {
  return [
    `Prayer Prompt — ${rec.title}`,
    '',
    'If the client has invited prayer into session, consider a brief closing prayer',
    'acknowledging the area of care being addressed.',
    '',
    `Suggested focus: ${rec.summary}`,
    '',
    'Note: Prayer is always led by the client\'s invitation and comfort. Never assume.',
    '',
    AI_DISCLAIMER,
  ].join('\n');
}

// ─── CBT / grounding exercise ────────────────────────────────────────────────

/**
 * Render a brief CBT or grounding exercise prompt.
 * @param {import('./types.js').Recommendation} rec
 * @returns {string}
 */
export function renderCbtExercise(rec) {
  const isAnxiety = rec.evidence?.some((e) => /GAD|anxiety/i.test(e));
  const exerciseType = isAnxiety ? '5-4-3-2-1 Grounding' : 'Thought Record';

  const lines = [
    `${exerciseType} Exercise — ${rec.title}`,
    '',
  ];

  if (exerciseType === '5-4-3-2-1 Grounding') {
    lines.push(
      'Guide the client through the 5-4-3-2-1 grounding technique:',
      '  5 — Name 5 things you can see',
      '  4 — Name 4 things you can touch',
      '  3 — Name 3 things you can hear',
      '  2 — Name 2 things you can smell',
      '  1 — Name 1 thing you can taste',
      '',
      'Encourage slow, deliberate breathing throughout.',
    );
  } else {
    lines.push(
      'Guide the client through a brief thought record:',
      '  Situation: What happened?',
      '  Automatic thought: What went through your mind?',
      '  Emotion: What did you feel, and how intense (0–100)?',
      '  Evidence for the thought:',
      '  Evidence against the thought:',
      '  Balanced thought: A more balanced way to see the situation.',
      '  Outcome: How do you feel now (0–100)?',
    );
  }

  lines.push('', AI_DISCLAIMER);
  return lines.join('\n');
}

// ─── Journal prompt ──────────────────────────────────────────────────────────

/**
 * Render a between-session journaling prompt.
 * @param {import('./types.js').Recommendation} rec
 * @returns {string}
 */
export function renderJournalPrompt(rec) {
  const hasFaith = rec.faithNote != null;
  const lines = [
    `Journaling Prompt — ${rec.title}`,
    '',
    'Between-session journaling prompt for the client:',
    '',
    `Reflect on: ${rec.summary}`,
    '',
    'Suggested questions:',
    '  • What patterns have you noticed this week related to this area?',
    '  • What is one small step you could take toward your goal?',
    '  • What thoughts or feelings came up that surprised you?',
  ];

  if (hasFaith) {
    lines.push(
      '',
      'Faith reflection (optional, only if client has invited this):',
      '  • Where did you sense God\'s presence or absence this week?',
      '  • Is there a Scripture passage that has been on your mind?',
    );
  }

  lines.push('', AI_DISCLAIMER);
  return lines.join('\n');
}

// ─── Follow-up message draft ─────────────────────────────────────────────────

/**
 * Render a brief follow-up message draft for coordination or monitoring items.
 * @param {string} clientFirstName
 * @param {import('./types.js').Recommendation} rec
 * @returns {string}
 */
export function renderFollowupMessage(clientFirstName, rec) {
  return [
    `Follow-up Message Draft — ${rec.title}`,
    '',
    `Hi ${clientFirstName || 'there'},`,
    '',
    `I wanted to follow up regarding ${rec.summary.toLowerCase().replace(/\.$/, '')}.`,
    'Please reach out if you have any questions or would like to discuss further.',
    '',
    '[Counselor name]',
    '',
    'Note: Review and personalise before sending. Do not send PHI through unsecured channels.',
    '',
    AI_DISCLAIMER,
  ].join('\n');
}

// ─── Dispatch helper ─────────────────────────────────────────────────────────

/**
 * Dispatch to the right template renderer for a given action key.
 * @param {string} actionKey
 * @param {import('./types.js').Recommendation} rec
 * @param {{ clientName?: string, clientFirstName?: string, allRecommendations?: import('./types.js').Recommendation[] }} ctx
 * @returns {string|null}
 */
export function renderActionContent(actionKey, rec, ctx = {}) {
  switch (actionKey) {
    case 'generate_session_agenda':
      return renderSessionAgenda(ctx.clientName ?? 'Client', ctx.allRecommendations ?? [rec]);
    case 'generate_note_prep':
      return renderNotePrep(rec);
    case 'suggest_verses':
      return renderVerseSuggestions(rec);
    case 'create_prayer_prompt':
      return renderPrayerPrompt(rec);
    case 'create_cbt_exercise':
      return renderCbtExercise(rec);
    case 'create_journal_prompt':
      return renderJournalPrompt(rec);
    case 'draft_followup_message':
      return renderFollowupMessage(ctx.clientFirstName ?? '', rec);
    default:
      return null;
  }
}
