// Insomnia Severity Index (ISI)
// Morin CM. Insomnia: Psychological Assessment and Management. Guilford Press, 1993.
// Morin CM, et al. Sleep 2011;34(5):601–608

const ISI_SEVERITY = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Mild' },
  { value: '2', label: 'Moderate' },
  { value: '3', label: 'Severe' },
  { value: '4', label: 'Very Severe' },
];

const ISI_IMPACT = [
  { value: '0', label: 'Not at all' },
  { value: '1', label: 'A little' },
  { value: '2', label: 'Somewhat' },
  { value: '3', label: 'Much' },
  { value: '4', label: 'Very Much' },
];

const ISI_SATISFACTION = [
  { value: '4', label: 'Very Dissatisfied' },
  { value: '3', label: 'Dissatisfied' },
  { value: '2', label: 'Moderately Satisfied' },
  { value: '1', label: 'Satisfied' },
  { value: '0', label: 'Very Satisfied' },
];

export const ISI_SCORE_IDS = ['isi1a','isi1b','isi1c','isi2','isi3','isi4','isi5'];

export function isiScoreInterpretation(total) {
  if (total >= 22) return { label: 'Severe Clinical Insomnia',      color: 'red',    description: `Score ${total}: Severe clinical insomnia. Evaluation for underlying causes and evidence-based treatment (CBT-I) are strongly recommended.` };
  if (total >= 15) return { label: 'Moderate Clinical Insomnia',    color: 'orange', description: `Score ${total}: Moderate clinical insomnia. CBT-I (Cognitive Behavioral Therapy for Insomnia) is the first-line recommended treatment.` };
  if (total >= 8)  return { label: 'Subthreshold Insomnia',         color: 'yellow', description: `Score ${total}: Subthreshold insomnia — some sleep difficulties present without full clinical severity. Sleep hygiene and further monitoring are recommended.` };
  return                  { label: 'No Clinically Significant Insomnia', color: 'green', description: `Score ${total}: No clinically significant insomnia.` };
}

export const InsomniaSeverityIndex = {
  id: 'insomnia_severity_index',
  title: 'Insomnia Severity Index (ISI)',
  description: 'The ISI is a validated 7-item tool measuring the nature, severity, and impact of insomnia. Rate your sleep difficulties over the past 2 weeks.',
  icon: '🌙',
  estimatedMinutes: 5,
  scorable: true,
  scoreFields: ISI_SCORE_IDS,
  scoreLabel: 'ISI Score',
  scoreMax: 28,
  scoreInterpretation: isiScoreInterpretation,
  sections: [
    {
      id: 'isi_severity',
      title: 'Sleep Problem Severity',
      description: 'For the following questions, please rate the SEVERITY of your sleep difficulties over the past 2 weeks.',
      fields: [
        { id: 'isi1a', label: '1a. Difficulty falling asleep',           type: 'gad_scale', options: ISI_SEVERITY },
        { id: 'isi1b', label: '1b. Difficulty staying asleep',           type: 'gad_scale', options: ISI_SEVERITY },
        { id: 'isi1c', label: '1c. Problems waking up too early',        type: 'gad_scale', options: ISI_SEVERITY },
        { id: 'isi2',  label: '2. How SATISFIED / dissatisfied are you with your current sleep pattern?', type: 'gad_scale', options: ISI_SATISFACTION },
        { id: 'isi3',  label: '3. To what extent do you consider your sleep problem to INTERFERE with your daily functioning (e.g., daytime fatigue, ability to function at work, mood, concentration)?', type: 'gad_scale', options: ISI_IMPACT },
        { id: 'isi4',  label: '4. How NOTICEABLE to others do you think your sleep problem is in terms of impairing the quality of your life?', type: 'gad_scale', options: ISI_IMPACT },
        { id: 'isi5',  label: '5. How WORRIED / distressed are you about your current sleep problem?',   type: 'gad_scale', options: ISI_IMPACT },
      ],
    },
    {
      id: 'isi_history',
      title: 'Sleep History & Context',
      fields: [
        { id: 'isi_duration',       label: 'How long have you been having sleep difficulties?',                                                         type: 'radio',      options: ['Less than 1 month', '1–3 months (acute)', '3–6 months', '6–12 months', 'More than 1 year (chronic)'] },
        { id: 'isi_typical_hours',  label: 'On a typical night, how many hours of sleep do you actually get?',                                          type: 'radio',      options: ['Less than 4 hours', '4–5 hours', '5–6 hours', '6–7 hours', '7–8 hours', 'More than 8 hours'] },
        { id: 'isi_sleep_hygiene',  label: 'Which sleep habits apply to you?',                                                                          type: 'checkboxes', options: ['Irregular sleep/wake times', 'Screen use in bed', 'Caffeine after noon', 'Alcohol to help sleep', 'Napping during the day', 'Worrying in bed', 'None of these'] },
        { id: 'isi_triggers',       label: 'What do you believe triggered or worsened your sleep problems?',                                            type: 'textarea',   placeholder: 'Stress, grief, anxiety, medication, life events, pregnancy, shift work, chronic pain…' },
        { id: 'isi_prev_treatment', label: 'Have you received any treatment for insomnia?',                                                             type: 'radio',      options: ['Yes — CBT-I (therapy)', 'Yes — medication only', 'Yes — both CBT-I and medication', 'No'] },
      ],
    },
    {
      id: 'isi_faith',
      title: 'Faith & Rest',
      description: '"He grants sleep to those he loves" (Psalm 127:2). Sabbath rest, trusting God with tomorrow\'s worries, and surrendering control are all spiritual dimensions of healthy sleep. These questions explore the relationship between your faith and your rest.',
      fields: [
        { id: 'isi_faith_worry',       label: 'Are worries, anxiety, or racing thoughts the primary driver of your sleep difficulties?',                  type: 'radio',    options: ['Yes, significantly', 'Somewhat', 'Minimally', 'No'] },
        { id: 'isi_faith_surrender',   label: 'Do you find it difficult to "cast your worries on God" (1 Pet. 5:7) in order to rest?',                   type: 'radio',    options: ['No — I do this well', 'Somewhat', 'I try but struggle', 'Yes — this is very difficult for me'] },
        { id: 'isi_faith_sabbath',     label: 'Do you practice any intentional Sabbath or rest rhythms in your weekly life?',                            type: 'radio',    options: ['Yes, a regular Sabbath practice', 'Somewhat — I try', 'Rarely', 'No'] },
        { id: 'isi_faith_night',       label: 'Have nighttime prayers, Scripture, or worship music helped you sleep or rest?',                           type: 'radio',    options: ['Yes, significantly', 'Somewhat', 'Not much', 'I have not tried this'] },
        { id: 'isi_faith_reflection',  label: 'Is there anything spiritual you would like to explore in connection with your sleep struggles?',          type: 'textarea', placeholder: 'Anxiety, control, grief, spiritual warfare, Sabbath theology…' },
      ],
    },
  ],
};
