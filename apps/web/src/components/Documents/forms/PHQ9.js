// PHQ-9: Patient Health Questionnaire — Depression Screener
// Kroenke K, Spitzer RL, Williams JBW. J Gen Intern Med 2001;16:606-13

const PHQ9_OPTIONS = [
  { value: '0', label: 'Not at all' },
  { value: '1', label: 'Several days' },
  { value: '2', label: 'More than half the days' },
  { value: '3', label: 'Nearly every day' },
];

export const PHQ9_SCORE_IDS = [
  'phq1','phq2','phq3','phq4','phq5','phq6','phq7','phq8','phq9',
];

const PHQ9_ITEMS = [
  { id: 'phq1', label: '1. Little interest or pleasure in doing things' },
  { id: 'phq2', label: '2. Feeling down, depressed, or hopeless' },
  { id: 'phq3', label: '3. Trouble falling or staying asleep, or sleeping too much' },
  { id: 'phq4', label: '4. Feeling tired or having little energy' },
  { id: 'phq5', label: '5. Poor appetite or overeating' },
  { id: 'phq6', label: '6. Feeling bad about yourself — or that you are a failure or have let yourself or your family down' },
  { id: 'phq7', label: '7. Trouble concentrating on things, such as reading or watching television' },
  { id: 'phq8', label: '8. Moving or speaking so slowly that other people could have noticed, or the opposite — being so fidgety you have been moving much more than usual' },
  { id: 'phq9', label: '9. Thoughts that you would be better off dead, or of hurting yourself in some way' },
].map((item) => ({ ...item, type: 'gad_scale', options: PHQ9_OPTIONS }));

export function phq9ScoreInterpretation(total) {
  if (total >= 20) return { label: 'Severe Depression',             color: 'red',    description: 'Scores 20–27 indicate severe depression. Immediate clinical evaluation, safety planning, and treatment initiation are indicated.' };
  if (total >= 15) return { label: 'Moderately Severe Depression',  color: 'orange', description: 'Scores 15–19 indicate moderately severe depression. Active treatment — pharmacotherapy and/or psychotherapy — is recommended.' };
  if (total >= 10) return { label: 'Moderate Depression',           color: 'yellow', description: 'Scores 10–14 indicate moderate depression. Treatment is warranted; review options with your counselor.' };
  if (total >= 5)  return { label: 'Mild Depression',               color: 'yellow', description: 'Scores 5–9 indicate mild depression. Watchful waiting, supportive counseling, and self-care strategies are appropriate.' };
  return                  { label: 'Minimal or No Depression',      color: 'green',  description: 'Scores 0–4 indicate minimal or no depression. Continue monitoring.' };
}

export const PHQ9 = {
  id: 'phq9',
  title: 'PHQ-9 Depression Screener',
  description: 'The validated 9-item Patient Health Questionnaire measures the severity of depression. Rate how often each problem has bothered you over the past two weeks.',
  icon: '🌧️',
  estimatedMinutes: 5,
  scorable: true,
  scoreFields: PHQ9_SCORE_IDS,
  scoreLabel: 'PHQ-9 Score',
  scoreMax: 27,
  scoreInterpretation: phq9ScoreInterpretation,
  sections: [
    {
      id: 'phq9_items',
      title: 'Depression Symptoms',
      description: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n⚠ Note: If you select "Several days" or more on item 9, your counselor will follow up with you to ensure your safety.',
      fields: PHQ9_ITEMS,
    },
    {
      id: 'phq9_functional',
      title: 'Daily Functioning',
      fields: [
        {
          id: 'phq_difficulty',
          label: 'How difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?',
          type: 'radio',
          options: ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'],
        },
        {
          id: 'phq_duration',
          label: 'Approximately how long have you been experiencing these feelings?',
          type: 'radio',
          options: ['Less than 2 weeks', '2–4 weeks', '1–3 months', '3–6 months', 'More than 6 months'],
        },
        {
          id: 'phq_context',
          label: 'Is there anything you believe is contributing to these feelings?',
          type: 'textarea',
          placeholder: 'Life events, losses, recent stressors, relationship changes…',
        },
      ],
    },
    {
      id: 'phq9_faith',
      title: 'Faith Dimension',
      description: 'These questions help your counselor understand the relationship between your faith and your current emotional experience.',
      fields: [
        { id: 'phq_god_connection',    label: 'How would you describe your sense of connection with God right now?',                             type: 'radio',    options: ['Very close and present', 'Mostly connected', 'Somewhat distant', 'Feeling absent or far away'] },
        { id: 'phq_prayer_impact',     label: 'Have depressive feelings affected your ability to pray, worship, or read Scripture?',              type: 'radio',    options: ['Not at all', 'Slightly', 'Moderately', 'Significantly'] },
        { id: 'phq_faith_hope',        label: 'What is your current sense of hope — in faith or otherwise — that things can change?',             type: 'radio',    options: ['Strong hope', 'Some hope', 'Very little hope', 'Struggling to find any hope'] },
        { id: 'phq_community_support', label: 'Is your faith community aware of or supporting you through this season?',                          type: 'radio',    options: ['Yes, actively supporting me', 'Somewhat aware', 'No — I keep this private', 'Not connected to a faith community'] },
        { id: 'phq_scripture_comfort', label: 'Are there any Scriptures or spiritual practices that have brought comfort?',                       type: 'textarea', placeholder: 'Share any passages, prayers, or practices that have helped…' },
      ],
    },
  ],
};
