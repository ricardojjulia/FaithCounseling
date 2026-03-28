// ASRS v1.1: Adult ADHD Self-Report Scale
// World Health Organization (2003); Kessler RC, et al. Psychol Med 2005;35:245–256

const ASRS_OPTIONS = [
  { value: '0', label: 'Never' },
  { value: '1', label: 'Rarely' },
  { value: '2', label: 'Sometimes' },
  { value: '3', label: 'Often' },
  { value: '4', label: 'Very Often' },
];

// Part A — 6 core screening items (highest clinical significance)
const ASRS_PART_A_ITEMS = [
  { id: 'asrs1', label: '1. How often do you have trouble wrapping up the final details of a project, once the challenging parts are done?' },
  { id: 'asrs2', label: '2. How often do you have difficulty getting things in order when you have to do a task that requires organization?' },
  { id: 'asrs3', label: '3. How often do you have problems remembering appointments or obligations?' },
  { id: 'asrs4', label: '4. When you have a task that requires a lot of thought, how often do you avoid or delay getting started?' },
  { id: 'asrs5', label: '5. How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?' },
  { id: 'asrs6', label: '6. How often do you feel overly active and compelled to do things, like you were driven by a motor?' },
].map((f) => ({ ...f, type: 'gad_scale', options: ASRS_OPTIONS }));

// Part B — 12 additional items
const ASRS_PART_B_ITEMS = [
  { id: 'asrs7',  label: '7. How often do you make careless mistakes when working on boring or difficult projects?' },
  { id: 'asrs8',  label: '8. How often do you have difficulty keeping your attention when doing boring or repetitive work?' },
  { id: 'asrs9',  label: '9. How often do you have difficulty concentrating on what people say, even when speaking directly to you?' },
  { id: 'asrs10', label: '10. How often do you misplace or have difficulty finding things at home or at work?' },
  { id: 'asrs11', label: '11. How often are you distracted by activity or noise around you?' },
  { id: 'asrs12', label: '12. How often do you leave your seat in situations where you are expected to remain seated?' },
  { id: 'asrs13', label: '13. How often do you feel restless or fidgety?' },
  { id: 'asrs14', label: '14. How often do you have difficulty unwinding and relaxing when you have time to yourself?' },
  { id: 'asrs15', label: '15. How often do you find yourself talking too much in social situations?' },
  { id: 'asrs16', label: '16. When in conversation, how often do you finish the sentences of the person you are talking with before they can finish?' },
  { id: 'asrs17', label: '17. How often do you have difficulty waiting your turn in situations where turn-taking is required?' },
  { id: 'asrs18', label: '18. How often do you interrupt others when they are busy?' },
].map((f) => ({ ...f, type: 'gad_scale', options: ASRS_OPTIONS }));

// ASRS Part A screening threshold: items 1-3 positive at ≥2 (Sometimes), items 4-6 positive at ≥3 (Often)
export function asrsScoreInterpretation(answers) {
  const thresholds = { asrs1: 2, asrs2: 2, asrs3: 2, asrs4: 2, asrs5: 3, asrs6: 3 };
  const positiveCount = Object.entries(thresholds).filter(
    ([id, threshold]) => parseInt(answers[id] ?? '0', 10) >= threshold,
  ).length;

  if (positiveCount >= 4) return { label: 'Likely ADHD Indicators',  color: 'orange', description: `${positiveCount}/6 Part A items above threshold — consistent with adult ADHD. A formal diagnostic evaluation by a qualified clinician is recommended. ADHD symptoms must be present in multiple settings and cause significant impairment.` };
  if (positiveCount >= 2) return { label: 'Some ADHD Indicators',    color: 'yellow', description: `${positiveCount}/6 Part A items above threshold. Some indicators present; discuss further assessment with your counselor.` };
  return                         { label: 'Minimal ADHD Indicators', color: 'green',  description: `${positiveCount}/6 Part A items above threshold. Symptoms are below the screening threshold for likely ADHD.` };
}

export const ASRSv1 = {
  id: 'asrs_v1',
  title: 'ASRS v1.1 — Adult ADHD Self-Report',
  description: 'The WHO Adult ADHD Self-Report Scale (ASRS v1.1) is an 18-item screener for adult ADHD. Part A (6 items) is the primary clinical screening tool. Rate frequency over the past 6 months.',
  icon: '⚡',
  estimatedMinutes: 8,
  scorable: true,
  scoreInterpretation: asrsScoreInterpretation,
  sections: [
    {
      id: 'asrs_part_a',
      title: 'Part A — Core Screening Items',
      description: 'For each question, rate how often you have experienced this over the past 6 months. These 6 items have the highest likelihood of predicting adult ADHD.',
      fields: ASRS_PART_A_ITEMS,
    },
    {
      id: 'asrs_part_b',
      title: 'Part B — Additional Symptoms',
      description: 'These 12 items provide further clinical context about the breadth and pattern of ADHD-related difficulties.',
      fields: ASRS_PART_B_ITEMS,
    },
    {
      id: 'asrs_history',
      title: 'History & Impact',
      fields: [
        { id: 'asrs_childhood',     label: 'Did you experience attention, impulsivity, or hyperactivity difficulties as a child?',                 type: 'radio',      options: ['Yes, significantly', 'Yes, somewhat', 'Not that I recall', 'No'] },
        { id: 'asrs_life_areas',    label: 'Which areas of life are most affected by attention or impulsivity challenges?',                        type: 'checkboxes', options: ['Work / Career', 'Relationships', 'Finances', 'Home Organization', 'Academic Performance', 'Time Management', 'Social Interactions', 'Spiritual Disciplines / Faith Practice'] },
        { id: 'asrs_prev_eval',     label: 'Have you been evaluated or treated for ADHD previously?',                                             type: 'radio',      options: ['Yes, diagnosed and treated', 'Yes, evaluated but not diagnosed', 'No, but I have wondered', 'No'] },
        { id: 'asrs_coping',        label: 'What strategies have you used to manage attention or organization challenges?',                        type: 'textarea',   placeholder: 'Lists, timers, reminders, routines, medication, coaching, apps…' },
      ],
    },
    {
      id: 'asrs_faith',
      title: 'Faith Dimension',
      description: 'ADHD can uniquely affect spiritual disciplines and faith community participation. These questions help your counselor understand the intersection of attention challenges and faith life.',
      fields: [
        { id: 'asrs_faith_disciplines', label: 'Do attention challenges affect your ability to engage in spiritual disciplines (prayer, Bible reading, worship)?', type: 'radio',    options: ['Not at all', 'Slightly', 'Moderately', 'Significantly'] },
        { id: 'asrs_faith_shame',       label: 'Do you carry shame or guilt about your attention challenges in the context of your faith?',                       type: 'radio',    options: ['No', 'Occasionally', 'Often', 'Yes — it significantly weighs on me'] },
        { id: 'asrs_faith_community',   label: 'Do attention or impulsivity challenges affect your participation in church or community?',                       type: 'radio',    options: ['Not at all', 'Occasionally', 'Often', 'Significantly'] },
        { id: 'asrs_faith_gifts',       label: 'Do you see ways your God-given design includes gifts that accompany your attention style?',                      type: 'textarea', placeholder: 'e.g., creativity, enthusiasm, compassion, big-picture thinking, energy for ministry…' },
      ],
    },
  ],
};
