// Anxiety Assessment — GAD-7 based with physical symptoms and Christian counseling questions
// Scoring: 0=Not at all, 1=Several days, 2=More than half the days, 3=Nearly every day
// Total 0–21: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe

export const GAD7_OPTIONS = [
  { value: '0', label: 'Not at all' },
  { value: '1', label: 'Several days' },
  { value: '2', label: 'More than half the days' },
  { value: '3', label: 'Nearly every day' },
];

export const GAD7_FIELDS = [
  { id: 'gad1', label: 'Feeling nervous, anxious, or on edge' },
  { id: 'gad2', label: 'Not being able to stop or control worrying' },
  { id: 'gad3', label: 'Worrying too much about different things' },
  { id: 'gad4', label: 'Trouble relaxing' },
  { id: 'gad5', label: 'Being so restless that it is hard to sit still' },
  { id: 'gad6', label: 'Becoming easily annoyed or irritable' },
  { id: 'gad7', label: 'Feeling afraid, as if something awful might happen' },
];

export const GAD7_SCORE_IDS = GAD7_FIELDS.map((f) => f.id);

export const anxietyScoreInterpretation = (total) => {
  if (total <= 4)  return { label: 'Minimal Anxiety',  color: 'green',  description: 'Symptoms are minimal. No clinical intervention may be needed at this time.' };
  if (total <= 9)  return { label: 'Mild Anxiety',     color: 'yellow', description: 'Mild symptoms present. Watchful waiting and self-care strategies are appropriate.' };
  if (total <= 14) return { label: 'Moderate Anxiety', color: 'orange', description: 'Moderate anxiety. Further assessment and possible therapy or medication is recommended.' };
  return           { label: 'Severe Anxiety',          color: 'red',    description: 'Severe anxiety. Active treatment — therapy and/or medication evaluation — is indicated.' };
};

export const AnxietyAssessment = {
  id: 'anxiety_assessment',
  title: 'Anxiety Assessment',
  description:
    'A clinically validated anxiety screening tool based on the GAD-7 scale, supplemented with physical symptom questions and a Christian counseling faith dimension. Takes approximately 10–15 minutes.',
  icon: '🧠',
  color: 'violet',
  estimatedMinutes: 12,
  scorable: true,
  scoreFields: GAD7_SCORE_IDS,
  scoreLabel: 'GAD-7 Score',
  scoreMax: 21,
  scoreInterpretation: anxietyScoreInterpretation,
  sections: [
    // ─── Personal Information ────────────────────────────────────────────────
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        { id: 'firstName',   label: 'First Name',    type: 'text',  required: true, half: true },
        { id: 'lastName',    label: 'Last Name',     type: 'text',  required: true, half: true },
        { id: 'dob',         label: 'Date of Birth', type: 'date',  required: true, half: true },
        { id: 'dateCompleted', label: 'Date Completed', type: 'date', half: true },
        { id: 'counselorName', label: 'Counselor Name (if known)', type: 'text', half: true },
      ],
    },

    // ─── GAD-7 Core Items ────────────────────────────────────────────────────
    {
      id: 'gad7',
      title: 'GAD-7: How Often Have You Been Bothered By These Problems?',
      description:
        'Over the last two weeks, how often have you been bothered by the following problems? Select the answer that best describes your experience.',
      fields: GAD7_FIELDS.map((f) => ({
        ...f,
        type: 'gad_scale',
        options: GAD7_OPTIONS,
        required: true,
      })),
    },

    // ─── Physical Symptoms ───────────────────────────────────────────────────
    {
      id: 'physical',
      title: 'Physical Symptoms',
      description:
        'Anxiety often has physical components. Please indicate how frequently you experience each of the following.',
      fields: [
        { id: 'pRacingHeart',    label: 'Racing or pounding heart (palpitations)', type: 'gad_scale', options: GAD7_OPTIONS },
        { id: 'pShortBreath',    label: 'Shortness of breath or feeling smothered', type: 'gad_scale', options: GAD7_OPTIONS },
        { id: 'pSweating',       label: 'Sweating, trembling, or shaking', type: 'gad_scale', options: GAD7_OPTIONS },
        { id: 'pDizziness',      label: 'Dizziness, light-headedness, or faintness', type: 'gad_scale', options: GAD7_OPTIONS },
        { id: 'pNausea',         label: 'Nausea or stomach upset', type: 'gad_scale', options: GAD7_OPTIONS },
        { id: 'pMuscle',         label: 'Muscle tension or aches', type: 'gad_scale', options: GAD7_OPTIONS },
        { id: 'pHeadaches',      label: 'Frequent headaches', type: 'gad_scale', options: GAD7_OPTIONS },
        { id: 'pFatigue',        label: 'Fatigue or being easily tired', type: 'gad_scale', options: GAD7_OPTIONS },
        { id: 'pSleepDifficulty',label: 'Sleep difficulties (falling or staying asleep)', type: 'gad_scale', options: GAD7_OPTIONS },
      ],
    },

    // ─── Anxiety Patterns & Triggers ─────────────────────────────────────────
    {
      id: 'patterns',
      title: 'Anxiety Patterns & Triggers',
      fields: [
        {
          id: 'anxietyTriggers',
          label: 'What situations, people, or thoughts tend to trigger your anxiety?',
          type: 'textarea',
          minRows: 3,
          placeholder: 'e.g., social situations, health concerns, work deadlines, financial stress, conflict…',
        },
        {
          id: 'anxietyDuration',
          label: 'When anxiety strikes, how long does it typically last?',
          type: 'select',
          options: ['Minutes', 'An hour or two', 'Several hours', 'Most of the day', 'Multiple days'],
        },
        {
          id: 'panicAttacks',
          label: 'Have you experienced sudden episodes of intense fear or panic (panic attacks)?',
          type: 'radio',
          options: ['Yes', 'No', 'Unsure'],
        },
        {
          id: 'panicFrequency',
          label: 'If yes, how often do panic attacks occur?',
          type: 'select',
          options: ['Rarely (a few times a year)', 'Occasionally (monthly)', 'Frequently (weekly)', 'Very frequently (multiple times a week)'],
          showIf: { field: 'panicAttacks', value: 'Yes' },
        },
        {
          id: 'avoidance',
          label: 'Do you avoid certain places, people, or activities because of anxiety?',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'avoidanceDetails',
          label: 'What do you avoid?',
          type: 'textarea',
          minRows: 2,
          showIf: { field: 'avoidance', value: 'Yes' },
        },
        {
          id: 'anxietyDuration2',
          label: 'How long have you been struggling with anxiety?',
          type: 'select',
          options: ['It is new (weeks)', '1–6 months', '6 months – 1 year', '1–5 years', 'Most of my life'],
        },
      ],
    },

    // ─── Impact on Daily Life ────────────────────────────────────────────────
    {
      id: 'impact',
      title: 'Impact on Daily Life',
      description:
        'The final GAD-7 question below assesses the functional impact of your anxiety.',
      fields: [
        {
          id: 'functionalImpact',
          label: 'How difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?',
          type: 'radio',
          options: ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'],
          required: true,
        },
        {
          id: 'workImpact',
          label: 'Rate the impact of anxiety on your work or school performance',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'No impact',
          maxLabel: 'Severe impact',
        },
        {
          id: 'relationshipsImpact',
          label: 'Rate the impact of anxiety on your relationships',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'No impact',
          maxLabel: 'Severe impact',
        },
        {
          id: 'selfCareImpact',
          label: 'Rate the impact of anxiety on your self-care (sleep, eating, exercise)',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'No impact',
          maxLabel: 'Severe impact',
        },
      ],
    },

    // ─── Coping Strategies ───────────────────────────────────────────────────
    {
      id: 'coping',
      title: 'Coping Strategies',
      fields: [
        {
          id: 'currentCoping',
          label: 'What strategies do you currently use to manage anxiety?',
          type: 'checkboxes',
          options: [
            'Deep breathing / relaxation exercises',
            'Exercise',
            'Talking to someone I trust',
            'Journaling',
            'Prayer',
            'Reading Scripture',
            'Worship music',
            'Mindfulness / meditation',
            'Distraction / staying busy',
            'Avoiding trigger situations',
            'Medication',
            'Alcohol or substances',
            'Other',
          ],
        },
        {
          id: 'helpfulStrategies',
          label: 'Which coping strategies are most helpful for you?',
          type: 'textarea',
          minRows: 2,
        },
        {
          id: 'unhelpfulStrategies',
          label: 'Are any coping strategies making things worse?',
          type: 'textarea',
          minRows: 2,
          placeholder: 'e.g., avoidance, excessive reassurance-seeking, substance use…',
        },
      ],
    },

    // ─── Christian Counseling — Faith Dimension ──────────────────────────────
    {
      id: 'faith',
      title: 'Faith Dimension',
      description:
        '"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." — Philippians 4:6–7\n\nAs a Christian counseling practice, we believe faith can be a powerful resource in facing anxiety. These questions help us understand the spiritual dimension of your experience.',
      fields: [
        {
          id: 'faithAnxietyConnection',
          label: 'How do you feel your faith and anxiety are connected?',
          type: 'textarea',
          minRows: 3,
          placeholder: 'Is your faith a source of peace? Of additional pressure? Both?',
        },
        {
          id: 'turnsToPrayerWhenAnxious',
          label: 'When you feel anxious, do you turn to prayer or Scripture?',
          type: 'radio',
          options: ['Yes, regularly', 'Sometimes', 'Rarely', 'No'],
        },
        {
          id: 'prayerHelpfulness',
          label: 'How helpful is prayer in managing your anxiety?',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'Not helpful',
          maxLabel: 'Very helpful',
        },
        {
          id: 'phil4Resonance',
          label: 'Philippians 4:6–7 ("Do not be anxious about anything, but in every situation, by prayer…") — how does this verse speak to your current experience?',
          type: 'textarea',
          minRows: 3,
          placeholder: 'Does it bring comfort? Do you find it difficult to apply? Share your honest reaction…',
        },
        {
          id: 'spiritualAnxietyFactors',
          label: 'Are any of the following spiritual concerns contributing to your anxiety?',
          type: 'checkboxes',
          options: [
            'Fear of God\'s judgment or punishment',
            'Doubt about God\'s existence or love',
            'Spiritual dryness / feeling distant from God',
            'Shame or guilt about past actions',
            'Uncertainty about God\'s will for my life',
            'Fear of death or eternity',
            'Conflicts with church or faith community',
            'None of the above',
          ],
        },
        {
          id: 'spiritualAnxietyDetails',
          label: 'Please describe any spiritual concerns contributing to your anxiety',
          type: 'textarea',
          minRows: 2,
        },
        {
          id: 'faithAffectingWorship',
          label: 'Has anxiety affected your participation in church, small group, or worship?',
          type: 'radio',
          options: ['Yes, significantly', 'Somewhat', 'Not really', 'No'],
        },
        {
          id: 'comfortingScriptures',
          label: 'Are there Bible verses or spiritual truths that bring you comfort in anxiety?',
          type: 'textarea',
          minRows: 2,
          placeholder: 'e.g., Psalm 23, Isaiah 41:10, Philippians 4:13, Matthew 6:25–34…',
        },
        {
          id: 'faithCommunitySupport',
          label: 'Do you have a faith community that provides emotional support during anxious times?',
          type: 'radio',
          options: ['Yes, strong support', 'Some support', 'Little support', 'No faith community currently'],
        },
        {
          id: 'spiritualPracticesForAnxiety',
          label: 'Which spiritual practices do you believe could help with your anxiety?',
          type: 'checkboxes',
          options: [
            'Prayer (conversational, intercessory)',
            'Contemplative / centering prayer',
            'Meditating on Scripture',
            'Worship music',
            'Fasting',
            'Accountability with a brother / sister in Christ',
            'Spiritual direction',
            'Journaling prayers',
            'Scripture memorization',
            'Serving others',
          ],
        },
        {
          id: 'godsTrustLevel',
          label: '"Cast all your anxiety on him because he cares for you." (1 Peter 5:7) — How easy is it for you to trust God with your worries?',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'Very difficult',
          maxLabel: 'Very easy',
        },
        {
          id: 'faithGoals',
          label: 'What faith-related goals would you like to work toward through counseling?',
          type: 'textarea',
          minRows: 3,
          placeholder: 'e.g., learning to surrender anxiety to God, growing in trust, finding peace through Scripture…',
        },
      ],
    },

    // ─── Additional Notes ────────────────────────────────────────────────────
    {
      id: 'notes',
      title: 'Additional Information',
      fields: [
        {
          id: 'previousAnxietyTreatment',
          label: 'Have you received treatment for anxiety before (therapy or medication)?',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'previousTreatmentDetails',
          label: 'Please describe (type, provider, outcome)',
          type: 'textarea',
          minRows: 2,
          showIf: { field: 'previousAnxietyTreatment', value: 'Yes' },
        },
        {
          id: 'anxietyMedications',
          label: 'Are you currently taking any medication for anxiety?',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'anxietyMedicationList',
          label: 'Please list medications and dosages',
          type: 'textarea',
          minRows: 2,
          showIf: { field: 'anxietyMedications', value: 'Yes' },
        },
        {
          id: 'additionalNotes',
          label: 'Is there anything else you would like your counselor to know about your anxiety?',
          type: 'textarea',
          minRows: 3,
        },
      ],
    },
  ],
};
