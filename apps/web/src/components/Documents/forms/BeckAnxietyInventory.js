// BAI: Beck Anxiety Inventory
// Beck AT, Epstein N, Brown G, Steer RA. J Consult Clin Psychol 1988;56:893–897

const BAI_OPTIONS = [
  { value: '0', label: 'Not at all' },
  { value: '1', label: 'Mildly — it did not bother me much' },
  { value: '2', label: 'Moderately — it was very unpleasant, but I could stand it' },
  { value: '3', label: 'Severely — I could barely stand it' },
];

const BAI_SYMPTOM_LABELS = [
  'Numbness or tingling',
  'Feeling hot',
  'Wobbliness in legs',
  'Unable to relax',
  'Fear of the worst happening',
  'Dizzy or lightheaded',
  'Heart pounding or racing',
  'Unsteady',
  'Terrified or afraid',
  'Nervous',
  'Feeling of choking',
  'Hands trembling',
  'Shaky or unsteady',
  'Fear of losing control',
  'Difficulty breathing',
  'Fear of dying',
  'Scared',
  'Indigestion or discomfort in the abdomen',
  'Faint or lightheaded',
  'Face flushed',
  'Hot or cold sweats',
];

export const BAI_SCORE_IDS = BAI_SYMPTOM_LABELS.map((_, i) => `bai${i + 1}`);

const BAI_FIELDS = BAI_SYMPTOM_LABELS.map((label, i) => ({
  id: `bai${i + 1}`,
  label: `${i + 1}. ${label}`,
  type: 'gad_scale',
  options: BAI_OPTIONS,
}));

export function baiScoreInterpretation(total) {
  if (total >= 26) return { label: 'Severe Anxiety',   color: 'red',    description: `Score ${total}: Severe levels of anxiety. Clinical evaluation and treatment planning are strongly recommended.` };
  if (total >= 16) return { label: 'Moderate Anxiety', color: 'orange', description: `Score ${total}: Moderate anxiety. Therapeutic intervention is recommended.` };
  if (total >= 8)  return { label: 'Mild Anxiety',     color: 'yellow', description: `Score ${total}: Mild anxiety. Monitoring and supportive coping strategies are appropriate.` };
  return                  { label: 'Minimal Anxiety',  color: 'green',  description: `Score ${total}: Minimal anxiety symptoms.` };
}

export const BeckAnxietyInventory = {
  id: 'beck_anxiety',
  title: 'Beck Anxiety Inventory (BAI)',
  description: 'A 21-item self-report instrument measuring the severity of anxiety symptoms over the past week. Widely used in clinical settings to differentiate anxiety from depression.',
  icon: '💨',
  estimatedMinutes: 7,
  scorable: true,
  scoreFields: BAI_SCORE_IDS,
  scoreLabel: 'BAI Score',
  scoreMax: 63,
  scoreInterpretation: baiScoreInterpretation,
  sections: [
    {
      id: 'bai_items',
      title: 'Anxiety Symptoms',
      description: 'Listed below are common symptoms of anxiety. Please indicate how much you have been bothered by each symptom during the past week, including today.',
      fields: BAI_FIELDS,
    },
    {
      id: 'bai_context',
      title: 'Context & History',
      fields: [
        { id: 'bai_onset',            label: 'When did these anxiety symptoms begin?',                                           type: 'radio',    options: ['Less than 1 month ago', '1–3 months ago', '3–6 months ago', '6–12 months ago', 'More than 1 year ago'] },
        { id: 'bai_triggers',         label: 'Are there specific situations or triggers that worsen your anxiety?',              type: 'textarea', placeholder: 'Describe any known triggers — places, people, thoughts, events…' },
        { id: 'bai_avoidance',        label: 'Do you avoid situations because of anxiety?',                                       type: 'radio',    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
        { id: 'bai_prev_treatment',   label: 'Have you received previous treatment for anxiety?',                                 type: 'radio',    options: ['Yes', 'No'] },
        { id: 'bai_treatment_detail', label: 'If yes, please describe the treatment and whether it helped.',                     type: 'textarea', placeholder: 'Type of therapy, medications, outcomes…', showIf: { field: 'bai_prev_treatment', value: 'Yes' } },
      ],
    },
    {
      id: 'bai_faith',
      title: 'Faith Dimension',
      description: 'Scripture speaks directly to fear and worry (Phil. 4:6–7; Matt. 6:25–34; 1 Pet. 5:7). These questions explore the spiritual dimension of your anxiety.',
      fields: [
        { id: 'bai_faith_peace',   label: 'How often do you experience a sense of peace that "surpasses understanding" (Phil. 4:7)?',          type: 'radio',    options: ['Frequently', 'Sometimes', 'Rarely', 'Almost never'] },
        { id: 'bai_prayer_anx',    label: 'Do you bring your anxieties to God in prayer regularly (1 Pet. 5:7)?',                               type: 'radio',    options: ['Yes, regularly', 'Sometimes', 'Rarely', 'I find it difficult to pray when anxious'] },
        { id: 'bai_spiritual_dim', label: 'Do you sense any spiritual dimension to your anxiety (fear of future, trust in God, spiritual attack)?', type: 'radio', options: ['Yes, definitely', 'Possibly', 'Probably not', 'No'] },
        { id: 'bai_faith_coping',  label: 'What spiritual practices have helped you manage anxiety?',                                           type: 'textarea', placeholder: 'Prayer, worship, Scripture memorization, community, journaling…' },
      ],
    },
  ],
};
