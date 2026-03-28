// DASS-21: Depression Anxiety Stress Scales (Short Form)
// Lovibond SH, Lovibond PF. Manual for the Depression Anxiety Stress Scales. 2nd ed. 1995.
//
// 21 items, each rated 0–3. Three subscales (7 items each):
//   Depression: items 3, 5, 10, 13, 16, 17, 21  (IDs: dass3, dass5, dass10, dass13, dass16, dass17, dass21)
//   Anxiety:    items 2, 4, 7, 9, 15, 19, 20    (IDs: dass2, dass4, dass7, dass9, dass15, dass19, dass20)
//   Stress:     items 1, 6, 8, 11, 12, 14, 18   (IDs: dass1, dass6, dass8, dass11, dass12, dass14, dass18)

const DASS_OPTIONS = [
  { value: '0', label: 'Did not apply to me at all' },
  { value: '1', label: 'Applied to me to some degree, or some of the time' },
  { value: '2', label: 'Applied to me to a considerable degree, or a good part of the time' },
  { value: '3', label: 'Applied to me very much, or most of the time' },
];

const DASS_ITEM_LABELS = [
  'I found it hard to wind down.',                                                                                         // 1  Stress
  'I was aware of dryness of my mouth.',                                                                                   // 2  Anxiety
  'I couldn\'t seem to experience any positive feeling at all.',                                                           // 3  Depression
  'I experienced breathing difficulty (e.g., rapid breathing, breathlessness in absence of physical exertion).',           // 4  Anxiety
  'I found it difficult to work up the initiative to do things.',                                                          // 5  Depression
  'I tended to over-react to situations.',                                                                                 // 6  Stress
  'I experienced trembling (e.g., in the hands).',                                                                        // 7  Anxiety
  'I felt that I was using a lot of nervous energy.',                                                                      // 8  Stress
  'I was worried about situations in which I might panic and make a fool of myself.',                                      // 9  Anxiety
  'I felt that I had nothing to look forward to.',                                                                         // 10 Depression
  'I found myself getting agitated.',                                                                                      // 11 Stress
  'I found it difficult to relax.',                                                                                        // 12 Stress
  'I felt down-hearted and blue.',                                                                                         // 13 Depression
  'I was intolerant of anything that kept me from getting on with what I was doing.',                                      // 14 Stress
  'I felt I was close to panic.',                                                                                          // 15 Anxiety
  'I was unable to become enthusiastic about anything.',                                                                   // 16 Depression
  'I felt I wasn\'t worth much as a person.',                                                                              // 17 Depression
  'I felt that I was rather touchy.',                                                                                      // 18 Stress
  'I was aware of the action of my heart without physical exertion (e.g., sense of heart rate increase, missed beat).',   // 19 Anxiety
  'I felt scared without any good reason.',                                                                                // 20 Anxiety
  'I felt that life was meaningless.',                                                                                     // 21 Depression
];

const DASS_FIELDS = DASS_ITEM_LABELS.map((label, i) => ({
  id: `dass${i + 1}`,
  label: `${i + 1}. ${label}`,
  type: 'gad_scale',
  options: DASS_OPTIONS,
}));

const DEP_IDS  = ['dass3','dass5','dass10','dass13','dass16','dass17','dass21'];
const ANX_IDS  = ['dass2','dass4','dass7','dass9','dass15','dass19','dass20'];
const STR_IDS  = ['dass1','dass6','dass8','dass11','dass12','dass14','dass18'];

function subscoreLabel(score, thresholds) {
  if (score >= thresholds[4]) return { level: 'Extremely Severe', color: 'red' };
  if (score >= thresholds[3]) return { level: 'Severe',           color: 'orange' };
  if (score >= thresholds[2]) return { level: 'Moderate',         color: 'yellow' };
  if (score >= thresholds[1]) return { level: 'Mild',             color: 'yellow' };
  return                             { level: 'Normal',           color: 'green' };
}

export function dass21ScoreInterpretation(answers) {
  const dep = DEP_IDS.reduce((s, id) => s + (parseInt(answers[id] ?? '0', 10) || 0), 0);
  const anx = ANX_IDS.reduce((s, id) => s + (parseInt(answers[id] ?? '0', 10) || 0), 0);
  const str = STR_IDS.reduce((s, id) => s + (parseInt(answers[id] ?? '0', 10) || 0), 0);

  // DASS-21 raw subscale thresholds (normal, mild, moderate, severe, extremely severe):
  const depR = subscoreLabel(dep, [0, 5, 7, 11, 14]);
  const anxR = subscoreLabel(anx, [0, 4, 6, 8, 10]);
  const strR = subscoreLabel(str, [0, 8, 10, 13, 17]);

  const worst = [depR, anxR, strR].sort((a, b) => {
    const order = { green: 0, yellow: 1, orange: 2, red: 3 };
    return order[b.color] - order[a.color];
  })[0];

  return {
    label: `Dep: ${depR.level} · Anx: ${anxR.level} · Stress: ${strR.level}`,
    color: worst.color,
    description: `Depression subscale: ${dep} (${depR.level}) · Anxiety subscale: ${anx} (${anxR.level}) · Stress subscale: ${str} (${strR.level}). Higher subscale scores indicate greater severity in each domain.`,
  };
}

export const DASS21 = {
  id: 'dass21',
  title: 'DASS-21 — Depression, Anxiety & Stress',
  description: 'The DASS-21 measures three related negative emotional states: depression, anxiety, and stress. Rate how much each statement applied to you over the past week.',
  icon: '🌪️',
  estimatedMinutes: 10,
  scorable: true,
  scoreInterpretation: dass21ScoreInterpretation,
  sections: [
    {
      id: 'dass_items',
      title: 'Depression, Anxiety & Stress Symptoms',
      description: 'Please read each statement and indicate how much the statement applied to you over the past week. There are no right or wrong answers — be as honest as possible.',
      fields: DASS_FIELDS,
    },
    {
      id: 'dass_context',
      title: 'Context & Duration',
      fields: [
        { id: 'dass_duration',    label: 'How long have you been experiencing these emotional difficulties?',             type: 'radio',    options: ['Less than 2 weeks', '2–4 weeks', '1–3 months', '3–12 months', 'More than 1 year'] },
        { id: 'dass_life_events', label: 'Are there current life events or circumstances that you believe are contributing?', type: 'textarea', placeholder: 'Losses, transitions, relationship challenges, health issues, work stress…' },
        { id: 'dass_prev_help',   label: 'Have you sought help for these feelings before?',                              type: 'radio',    options: ['Yes', 'No'] },
        { id: 'dass_most_impact', label: 'Which of the three areas — depression, anxiety, or stress — feels most burdensome?', type: 'radio', options: ['Depression (low mood, hopelessness)', 'Anxiety (fear, physical tension)', 'Stress (overwhelm, irritability)', 'All three equally', 'Unsure'] },
      ],
    },
    {
      id: 'dass_faith',
      title: 'Faith Dimension',
      description: 'Emotional health and spiritual health are deeply intertwined. "Cast your burden on the Lord, and he will sustain you" (Ps. 55:22). These questions explore how faith intersects with your current emotional experience.',
      fields: [
        { id: 'dass_faith_sustain',    label: 'Do you experience your faith as a source of sustenance or comfort in this season?',                type: 'radio',    options: ['Yes, significantly', 'Somewhat', 'Not much currently', 'No — faith feels distant'] },
        { id: 'dass_faith_lament',     label: 'Are you able to express your distress honestly to God through prayer or lament?',                   type: 'radio',    options: ['Yes, regularly', 'Sometimes', 'Rarely', 'I do not feel I can or should'] },
        { id: 'dass_faith_community',  label: 'Is your faith community a source of support, or does it add to your stress?',                      type: 'radio',    options: ['Source of strong support', 'Somewhat supportive', 'Neutral', 'Sometimes adds stress', 'Significantly adds stress'] },
        { id: 'dass_faith_practices',  label: 'Which spiritual practices (if any) have helped most with your emotional wellbeing?',               type: 'textarea', placeholder: 'Prayer, worship, Sabbath rest, Scripture meditation, gratitude journaling, fellowship…' },
      ],
    },
  ],
};
