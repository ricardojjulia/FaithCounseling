// Self-Harm & Suicide Risk Assessment
// Based on the Columbia Suicide Severity Rating Scale (C-SSRS) — simplified clinician-adapted version
// with non-suicidal self-injury (NSSI) screening and Christian counseling faith dimension.
//
// IMPORTANT: This tool screens for risk. A positive screen requires immediate clinical follow-up.
// Crisis resources: 988 Suicide & Crisis Lifeline (call/text 988), Crisis Text Line (text HOME to 741741)

export const selfHarmRiskInterpretation = (answers) => {
  const active = answers.cssrs2 === 'Yes';
  const plan   = answers.cssrs3 === 'Yes';
  const intent = answers.cssrs4 === 'Yes';
  const method = answers.cssrs5 === 'Yes';
  const attempt = answers.cssrs8 === 'Yes';

  if (method || intent) return { label: 'Imminent Risk',  color: 'red',    description: 'Active suicidal ideation with plan and intent. Requires immediate clinical intervention and safety planning.' };
  if (plan || attempt)   return { label: 'High Risk',     color: 'orange', description: 'Active ideation with plan, or prior attempt. Requires urgent clinical assessment.' };
  if (active)            return { label: 'Moderate Risk', color: 'yellow', description: 'Active suicidal ideation without plan. Requires clinical assessment and safety planning.' };
  if (answers.cssrs1 === 'Yes') return { label: 'Low Risk / Monitor', color: 'blue', description: 'Passive suicidal ideation. Monitor closely and develop collaborative safety plan.' };
  return { label: 'Minimal / Screened Negative', color: 'green', description: 'No current suicidal ideation reported. Continue supportive assessment.' };
};

export const SelfHarmAssessment = {
  id: 'self_harm_assessment',
  title: 'Self-Harm & Suicide Risk Assessment',
  description:
    'A clinically grounded screening tool adapted from the Columbia Suicide Severity Rating Scale (C-SSRS), supplemented with non-suicidal self-injury screening and a Christian counseling faith dimension. This assessment should be reviewed by a licensed clinician. Takes approximately 15–20 minutes.',
  icon: '🛡️',
  color: 'red',
  estimatedMinutes: 18,
  scorable: true,
  scoreLabel: 'Risk Level',
  scoreInterpretation: selfHarmRiskInterpretation,
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
        { id: 'counselorName', label: 'Clinician Completing / Reviewing', type: 'text', half: true },
        { id: 'referralReason', label: 'Reason for this assessment', type: 'textarea', minRows: 2 },
      ],
    },

    // ─── Crisis Resources Notice ─────────────────────────────────────────────
    {
      id: 'notice',
      title: 'Before We Begin',
      description:
        'This assessment asks about thoughts of self-harm and suicide. We ask because we care deeply about your wellbeing. Your answers are confidential, with limits required by law when there is risk of harm. If you are in immediate danger right now, please stop and call 911 or the 988 Suicide & Crisis Lifeline (call or text 988). You may also text HOME to 741741 (Crisis Text Line).',
      fields: [
        {
          id: 'safeRightNow',
          label: 'Are you safe right now?',
          type: 'radio',
          options: ['Yes, I am safe', 'No, I need help now'],
          required: true,
        },
      ],
    },

    // ─── C-SSRS Ideation — Part 1 ────────────────────────────────────────────
    {
      id: 'cssrs_ideation',
      title: 'Suicidal Ideation — Columbia Protocol (C-SSRS)',
      description:
        'The following questions ask about thoughts of death and suicide. Please answer as honestly as you can. There are no right or wrong answers.',
      fields: [
        // C-SSRS Item 1 — Passive ideation
        {
          id: 'cssrs1',
          label: '1. Have you wished you were dead or wished you could go to sleep and not wake up?',
          type: 'radio',
          options: ['Yes', 'No'],
          required: true,
        },
        {
          id: 'cssrs1_frequency',
          label: 'If yes — how often in the past month?',
          type: 'select',
          options: ['Once or twice', 'Several times', 'Many times (weekly or more)', 'Nearly daily'],
          showIf: { field: 'cssrs1', value: 'Yes' },
        },
        // C-SSRS Item 2 — Active ideation, no method/plan
        {
          id: 'cssrs2',
          label: '2. Have you actually had any thoughts of killing yourself?',
          type: 'radio',
          options: ['Yes', 'No'],
          required: true,
        },
        {
          id: 'cssrs2_frequency',
          label: 'If yes — how often?',
          type: 'select',
          options: ['Once or twice', 'Several times', 'Many times (weekly)', 'Nearly daily'],
          showIf: { field: 'cssrs2', value: 'Yes' },
        },
        {
          id: 'cssrs2_intensity',
          label: 'How intense are these thoughts? (0 = barely there, 10 = overwhelming)',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'Barely there',
          maxLabel: 'Overwhelming',
          showIf: { field: 'cssrs2', value: 'Yes' },
        },
        // C-SSRS Item 3 — Method/plan
        {
          id: 'cssrs3',
          label: '3. Have you been thinking about how you might do this? (e.g., a specific method or plan)',
          type: 'radio',
          options: ['Yes', 'No'],
          showIf: { field: 'cssrs2', value: 'Yes' },
        },
        {
          id: 'cssrs3_method',
          label: 'What method or plan have you considered? (describe only if you feel comfortable)',
          type: 'textarea',
          minRows: 2,
          showIf: { field: 'cssrs3', value: 'Yes' },
        },
        // C-SSRS Item 4 — Intention to act
        {
          id: 'cssrs4',
          label: '4. Have you had thoughts of suicide AND some intention of acting on them?',
          type: 'radio',
          options: ['Yes', 'No', 'Unsure'],
          showIf: { field: 'cssrs2', value: 'Yes' },
        },
        // C-SSRS Item 5 — Active plan with intent
        {
          id: 'cssrs5',
          label: '5. Have you started to work out the details of how to end your life, and do you intend to carry out this plan?',
          type: 'radio',
          options: ['Yes', 'No'],
          showIf: { field: 'cssrs4', value: 'Yes' },
        },
        {
          id: 'cssrs_access',
          label: 'Do you have access to the means you described (e.g., firearms, medications, etc.)?',
          type: 'radio',
          options: ['Yes', 'No', 'Unsure'],
          showIf: { field: 'cssrs3', value: 'Yes' },
        },
      ],
    },

    // ─── Non-Suicidal Self-Injury (NSSI) ─────────────────────────────────────
    {
      id: 'nssi',
      title: 'Non-Suicidal Self-Injury (NSSI)',
      description:
        'Self-harm without intent to die is also important for us to understand. Please answer honestly.',
      fields: [
        {
          id: 'nssi1',
          label: 'Have you ever intentionally hurt yourself (e.g., cutting, burning, hitting, scratching) without the intent to die?',
          type: 'radio',
          options: ['Yes', 'No'],
          required: true,
        },
        {
          id: 'nssi_methods',
          label: 'If yes — what methods have you used?',
          type: 'checkboxes',
          options: ['Cutting', 'Burning', 'Hitting / punching self', 'Scratching', 'Hair pulling', 'Bruising / banging', 'Other'],
          showIf: { field: 'nssi1', value: 'Yes' },
        },
        {
          id: 'nssi_frequency',
          label: 'How often do you currently engage in self-harm?',
          type: 'select',
          options: ['Not currently', 'Rarely (a few times a year)', 'Monthly', 'Weekly', 'Daily or near-daily'],
          showIf: { field: 'nssi1', value: 'Yes' },
        },
        {
          id: 'nssi_recentDate',
          label: 'When did you last hurt yourself?',
          type: 'text',
          placeholder: 'Approximate date or timeframe',
          showIf: { field: 'nssi1', value: 'Yes' },
        },
        {
          id: 'nssi_function',
          label: 'What does self-harm do for you? What need does it meet?',
          type: 'checkboxes',
          options: [
            'Relieves emotional pain',
            'Releases numbness — helps me feel something',
            'Self-punishment / guilt',
            'Control over my body',
            'Communicating pain to others',
            'Unsure',
            'Other',
          ],
          showIf: { field: 'nssi1', value: 'Yes' },
        },
        {
          id: 'nssi_wantToStop',
          label: 'Do you want to stop self-harming?',
          type: 'radio',
          options: ['Yes', 'Mostly yes', 'Unsure', 'Not at this time'],
          showIf: { field: 'nssi1', value: 'Yes' },
        },
      ],
    },

    // ─── C-SSRS Behavior — Past Attempt History ──────────────────────────────
    {
      id: 'cssrs_behavior',
      title: 'History of Suicidal Behavior',
      description:
        'These questions ask about events in your past.',
      fields: [
        {
          id: 'cssrs8',
          label: 'Have you ever made a suicide attempt (an act with at least some intent to die)?',
          type: 'radio',
          options: ['Yes', 'No'],
          required: true,
        },
        {
          id: 'cssrs8_number',
          label: 'Approximately how many attempts have you made?',
          type: 'number',
          min: 1,
          showIf: { field: 'cssrs8', value: 'Yes' },
        },
        {
          id: 'cssrs8_mostRecent',
          label: 'When was your most recent attempt?',
          type: 'text',
          placeholder: 'Approximate date or timeframe (e.g., six months ago, age 22)',
          showIf: { field: 'cssrs8', value: 'Yes' },
        },
        {
          id: 'cssrs8_method',
          label: 'Method used in most recent attempt (describe only if comfortable)',
          type: 'textarea',
          minRows: 2,
          showIf: { field: 'cssrs8', value: 'Yes' },
        },
        {
          id: 'cssrs8_medAttention',
          label: 'Did you receive medical attention after the most recent attempt?',
          type: 'radio',
          options: ['Yes', 'No'],
          showIf: { field: 'cssrs8', value: 'Yes' },
        },
        {
          id: 'interruptedAttempt',
          label: 'Has anyone ever stopped you from making an attempt (interrupted attempt)?',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'abortedAttempt',
          label: 'Have you ever started an attempt but stopped yourself before hurting yourself?',
          type: 'radio',
          options: ['Yes', 'No'],
        },
      ],
    },

    // ─── Protective Factors ──────────────────────────────────────────────────
    {
      id: 'protective',
      title: 'Protective Factors & Reasons for Living',
      description:
        'Research shows that certain factors protect against suicide. Understanding what keeps you here is important.',
      fields: [
        {
          id: 'reasonsForLiving',
          label: 'What are your most important reasons for living?',
          type: 'textarea',
          required: true,
          minRows: 4,
          placeholder: 'Please be as specific as possible — children, faith, relationships, future plans, purpose…',
        },
        {
          id: 'protectiveCheckboxes',
          label: 'Which of the following apply to you?',
          type: 'checkboxes',
          options: [
            'Responsibility to children or dependents',
            'Fear of death or the dying process',
            'Strong social support (family, friends)',
            'Active faith / relationship with God',
            'Fear of harming loved ones by dying',
            'Moral or religious objection to suicide',
            'Hope that things will get better',
            'Plans for the future (goals, dreams)',
            'Fear of not completing the act',
            'Concern about what others would think',
          ],
        },
        {
          id: 'hopefulnessRating',
          label: 'How hopeful are you about your future?',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'No hope at all',
          maxLabel: 'Very hopeful',
        },
        {
          id: 'whyNow',
          label: 'What has made this harder recently? What has changed?',
          type: 'textarea',
          minRows: 3,
        },
        {
          id: 'crisisContact1Name',  label: 'Crisis contact #1 — Name',         type: 'text', half: true },
        { id: 'crisisContact1Phone', label: 'Crisis contact #1 — Phone',         type: 'tel',  half: true },
        { id: 'crisisContact2Name',  label: 'Crisis contact #2 — Name',         type: 'text', half: true },
        { id: 'crisisContact2Phone', label: 'Crisis contact #2 — Phone',         type: 'tel',  half: true },
        {
          id: 'safePlaceToGo',
          label: 'If you were in crisis, where would you go or who would you call?',
          type: 'textarea',
          minRows: 2,
        },
        {
          id: 'meansRestriction',
          label: 'Do you have access to firearms, lethal medications, or other means at home?',
          type: 'radio',
          options: ['Yes', 'No', 'Prefer not to say'],
        },
        {
          id: 'meansRestrictionPlan',
          label: 'Would you be willing to limit access to means during a crisis (e.g., have firearms temporarily stored elsewhere)?',
          type: 'radio',
          options: ['Yes', 'No', 'Unsure', 'Not applicable'],
        },
      ],
    },

    // ─── Current Suffering ───────────────────────────────────────────────────
    {
      id: 'suffering',
      title: 'Current Emotional State',
      fields: [
        {
          id: 'currentSuffering',
          label: 'Right now, how much emotional pain or suffering are you experiencing?',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'None',
          maxLabel: 'Unbearable',
        },
        {
          id: 'currentHope',
          label: 'Right now, how hopeful do you feel that things can get better?',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'No hope',
          maxLabel: 'Very hopeful',
        },
        {
          id: 'currentEmotions',
          label: 'Which of the following best describe how you are feeling right now?',
          type: 'checkboxes',
          options: [
            'Hopeless',
            'Trapped / no way out',
            'A burden to others',
            'Alone / isolated',
            'Angry / rageful',
            'Numb / disconnected',
            'Ashamed',
            'Sad / depressed',
            'Anxious / afraid',
            'Determined to get better',
            'Hopeful',
            'Supported',
            'Safe',
          ],
        },
        {
          id: 'unbearablePain',
          label: 'What makes the pain feel unbearable? What would make it more tolerable?',
          type: 'textarea',
          minRows: 3,
        },
      ],
    },

    // ─── Christian Counseling — Faith Dimension ──────────────────────────────
    {
      id: 'faith',
      title: 'Faith Dimension',
      description:
        '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future." — Jeremiah 29:11\n\n"The Lord is close to the brokenhearted and saves those who are crushed in spirit." — Psalm 34:18\n\nWe believe God is present in the darkest valleys and that there is hope in Him. These questions help us understand the spiritual dimension of your experience — and how your faith can be part of your healing.',
      fields: [
        {
          id: 'faithHopeConnection',
          label: 'Does your faith provide a sense of hope or meaning for your life?',
          type: 'radio',
          options: ['Yes, strongly', 'Somewhat', 'I am struggling to find this right now', 'No'],
        },
        {
          id: 'godsPurpose',
          label: 'Do you believe God has a plan and purpose for your life, even in your current pain?',
          type: 'radio',
          options: ['Yes, I believe this', 'I want to believe this but struggle to', 'I am not sure', 'I cannot believe this right now'],
        },
        {
          id: 'jer2911',
          label: '"For I know the plans I have for you…plans to give you hope and a future." (Jeremiah 29:11) — How does this verse land with you right now?',
          type: 'textarea',
          minRows: 3,
          placeholder: 'Does it bring comfort? Does it feel far away? What is your honest reaction?',
        },
        {
          id: 'spiritualCrisis',
          label: 'Are you experiencing a spiritual crisis (feeling abandoned by God, questioning His existence or love)?',
          type: 'radio',
          options: ['Yes', 'Somewhat', 'No'],
        },
        {
          id: 'spiritualCrisisDetails',
          label: 'Please describe your spiritual crisis',
          type: 'textarea',
          minRows: 3,
          placeholder: '"My God, my God, why have you forsaken me?" (Psalm 22:1) — many people of faith have felt this. Share your heart…',
          showIf: { field: 'spiritualCrisis', value: 'Yes' },
        },
        {
          id: 'godPresence',
          label: 'Do you feel connected to God right now?',
          type: 'scale',
          min: 0,
          max: 10,
          minLabel: 'Completely disconnected',
          maxLabel: 'Very connected',
        },
        {
          id: 'moralReligiousObjection',
          label: 'Does your faith create a moral or spiritual barrier against suicide or self-harm?',
          type: 'radio',
          options: ['Yes, strongly', 'Somewhat', 'I am not sure right now', 'No'],
        },
        {
          id: 'churchSupportInCrisis',
          label: 'Do you have a pastor, elder, or faith community member you can reach out to in a crisis?',
          type: 'radio',
          options: ['Yes', 'No', 'I am not sure they would understand'],
        },
        {
          id: 'pastoralContact',
          label: 'Pastor / spiritual leader name and phone',
          type: 'text',
          showIf: { field: 'churchSupportInCrisis', value: 'Yes' },
        },
        {
          id: 'openToPrayer',
          label: 'Would you be open to praying together right now or at your next session?',
          type: 'radio',
          options: ['Yes, I would welcome this', 'Maybe', 'Not right now'],
        },
        {
          id: 'hopefulScriptures',
          label: 'Are there scriptures or spiritual truths that give you hope, even a flicker?',
          type: 'textarea',
          minRows: 2,
          placeholder: 'e.g., Psalm 34:18, Lamentations 3:22–23, Romans 8:38–39, John 16:33…',
        },
        {
          id: 'faithCrisisHealing',
          label: 'What role would you like faith and God to play in your healing journey?',
          type: 'textarea',
          minRows: 3,
          placeholder: 'e.g., prayer, Scripture, community, renewed sense of purpose, forgiveness, spiritual direction…',
        },
        {
          id: 'christianCrisisResources',
          label: 'Are you aware of Christian crisis resources? (e.g., Focus on the Family counseling line: 1-855-771-HELP)',
          type: 'radio',
          options: ['Yes', 'No — I would like information'],
        },
      ],
    },

    // ─── Clinician Notes ─────────────────────────────────────────────────────
    {
      id: 'clinical_notes',
      title: 'Clinician Section — For Office Use Only',
      description: 'To be completed by the reviewing clinician.',
      fields: [
        {
          id: 'clinicianRiskLevel',
          label: 'Clinician-assessed risk level',
          type: 'select',
          options: ['Minimal', 'Low', 'Moderate', 'High', 'Imminent'],
        },
        {
          id: 'clinicianActions',
          label: 'Actions taken',
          type: 'checkboxes',
          options: [
            'Safety plan completed',
            'Emergency contact notified',
            '911 / emergency services contacted',
            'Voluntary hospitalization arranged',
            'Involuntary hold initiated',
            'Crisis line information provided',
            'Follow-up appointment scheduled',
            'Means restriction counseled',
            'Pastoral / spiritual referral made',
            'No action required at this time',
          ],
        },
        {
          id: 'clinicianNotes',
          label: 'Clinician notes',
          type: 'textarea',
          minRows: 5,
        },
        {
          id: 'clinicianSignature',
          label: 'Clinician name / signature',
          type: 'text',
          half: true,
        },
        {
          id: 'clinicianDate',
          label: 'Date reviewed',
          type: 'date',
          half: true,
        },
      ],
    },
  ],
};
