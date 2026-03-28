// ACE Questionnaire: Adverse Childhood Experiences
// Based on the CDC-Kaiser Permanente ACE Study (Felitti VJ, et al. Am J Prev Med 1998;14:245–258)
// Categories: physical/emotional/sexual abuse, neglect, and household dysfunction

export function aceScoreInterpretation(answers) {
  const aceIds = [
    'ace_abuse_physical','ace_abuse_emotional','ace_abuse_sexual',
    'ace_neglect_physical','ace_neglect_emotional',
    'ace_household_ipv','ace_household_substance','ace_household_mh',
    'ace_household_incarcerated','ace_household_divorce',
  ];
  const score = aceIds.reduce((sum, id) => sum + (answers[id] === 'Yes' ? 1 : 0), 0);

  if (score >= 6) return { label: `ACE Score: ${score} — Very High Risk`,  color: 'red',    description: `ACE score ${score}: Research shows a dose-response relationship between ACE score and risk for mental, physical, and social health problems. Scores ≥6 are associated with significantly elevated lifetime risk. Trauma-informed care and comprehensive support are strongly recommended.` };
  if (score >= 4) return { label: `ACE Score: ${score} — High Risk`,       color: 'orange', description: `ACE score ${score}: Scores ≥4 are associated with substantially increased risk for depression, anxiety, PTSD, substance use, and chronic disease. Trauma-informed treatment is recommended.` };
  if (score >= 2) return { label: `ACE Score: ${score} — Moderate Risk`,   color: 'yellow', description: `ACE score ${score}: Some elevated risk associated with adverse childhood experiences. Discuss the role of early adversity in current functioning with your counselor.` };
  if (score === 1) return { label: `ACE Score: ${score} — Low-Moderate Risk`, color: 'yellow', description: `ACE score 1: One adverse childhood experience noted. Discuss with your counselor how this may have affected your development.` };
  return                  { label: 'ACE Score: 0 — No Reported Adversities', color: 'green',  description: 'No adverse childhood experiences reported across the 10 categories. This does not preclude other formative experiences worth exploring in counseling.' };
}

export const ACEQuestionnaire = {
  id: 'ace_questionnaire',
  title: 'ACE Questionnaire — Childhood Adversity',
  description: 'The Adverse Childhood Experiences (ACE) questionnaire screens for 10 categories of childhood adversity before age 18. Higher scores are associated with increased risk for mental and physical health challenges in adulthood.',
  icon: '🔍',
  estimatedMinutes: 8,
  scorable: true,
  scoreInterpretation: aceScoreInterpretation,
  sections: [
    {
      id: 'ace_context',
      title: 'About This Assessment',
      description: 'This questionnaire asks about experiences before your 18th birthday. All responses are confidential and used to help your counselor understand your background. You are not required to answer any question you are not comfortable with.',
      fields: [
        { id: 'ace_age_now',       label: 'Your current age',               type: 'number',   min: 0, max: 120, placeholder: 'Years' },
        { id: 'ace_willingness',   label: 'How comfortable are you disclosing childhood experiences today?', type: 'radio', options: ['Very comfortable', 'Somewhat comfortable', 'Somewhat uncomfortable', 'This is difficult — I may not answer all questions'] },
      ],
    },
    {
      id: 'ace_abuse',
      title: 'Abuse (Before Age 18)',
      description: 'Please answer "Yes" or "No" for each type of experience before your 18th birthday.',
      fields: [
        {
          id: 'ace_abuse_physical',
          label: 'Physical Abuse — A parent or other adult in the household often pushed, grabbed, slapped, threw something at you, or hit you hard enough to leave marks.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'ace_abuse_emotional',
          label: 'Emotional Abuse — A parent or other adult in the household often swore at you, insulted you, put you down, or humiliated you, or acted in a way that made you afraid you might be physically hurt.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'ace_abuse_sexual',
          label: 'Sexual Abuse — An adult or person at least 5 years older than you ever touched or fondled you in a sexual way, or had you touch their body in a sexual way, or attempted or actually had oral, anal, or vaginal intercourse with you.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
      ],
    },
    {
      id: 'ace_neglect',
      title: 'Neglect (Before Age 18)',
      fields: [
        {
          id: 'ace_neglect_physical',
          label: 'Physical Neglect — You often didn\'t have enough to eat, had to wear dirty clothes, or had no one to protect you; or your parents were too drunk or high to take care of you or get you to a doctor when you needed it.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'ace_neglect_emotional',
          label: 'Emotional Neglect — You often felt that no one in your family loved you or thought you were important or special, or your family didn\'t look out for each other, feel close to each other, or support each other.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
      ],
    },
    {
      id: 'ace_household',
      title: 'Household Dysfunction (Before Age 18)',
      fields: [
        {
          id: 'ace_household_ipv',
          label: 'Domestic Violence — Your mother or stepmother was sometimes, often, or very often pushed, grabbed, slapped, had something thrown at her, or was kicked, bitten, hit with a fist, or hit with something hard, or repeatedly hit for at least a few minutes, or threatened with a gun or knife.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'ace_household_substance',
          label: 'Substance Abuse in Household — You lived with anyone who was a problem drinker or alcoholic, or who used street drugs.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'ace_household_mh',
          label: 'Mental Illness in Household — A household member was depressed or mentally ill, or attempted suicide.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'ace_household_incarcerated',
          label: 'Incarcération — A household member went to prison.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
        {
          id: 'ace_household_divorce',
          label: 'Parental Separation or Divorce — Your parents were ever separated or divorced.',
          type: 'radio',
          options: ['Yes', 'No'],
        },
      ],
    },
    {
      id: 'ace_impact',
      title: 'Current Impact & Reflection',
      fields: [
        { id: 'ace_current_impact',   label: 'Do you believe childhood adversities continue to affect your life today?',                              type: 'radio',    options: ['Yes, significantly', 'Somewhat', 'Minimally', 'Not that I can identify', 'I have not thought about it'] },
        { id: 'ace_prev_processing',  label: 'Have you previously worked through these childhood experiences in therapy or counseling?',              type: 'radio',    options: ['Yes, extensively', 'Somewhat', 'Briefly', 'No'] },
        { id: 'ace_safe_to_discuss',  label: 'Are you open to exploring the impact of these experiences in counseling?',                             type: 'radio',    options: ['Yes, I want to work through them', 'Somewhat open', 'I need to feel safer first', 'Not at this time'] },
        { id: 'ace_other_adversity',  label: 'Are there other formative childhood experiences (not listed above) that have significantly shaped you?', type: 'textarea', placeholder: 'Share anything additional that feels relevant…' },
      ],
    },
    {
      id: 'ace_faith',
      title: 'Faith & Healing from Childhood Wounds',
      description: '"He heals the brokenhearted and binds up their wounds" (Psalm 147:3). These questions explore how faith intersects with your journey of healing from childhood adversity.',
      fields: [
        { id: 'ace_faith_father',     label: 'How have early experiences with caregivers shaped your image of God as Father?',                     type: 'radio',    options: ['My image of God is positive and secure', 'Somewhat affected by early experiences', 'Significantly affected — I struggle to see God as safe or loving', 'I have not considered this connection'] },
        { id: 'ace_faith_healing',    label: 'Do you believe God can bring healing and redemption from childhood wounds?',                          type: 'radio',    options: ['Yes, I believe and have experienced this', 'I believe it is possible', 'I hope so but struggle to believe it for myself', 'I find this difficult to believe'] },
        { id: 'ace_faith_community',  label: 'Has your faith community been a source of safety, belonging, and healing?',                           type: 'radio',    options: ['Yes, deeply', 'Somewhat', 'Minimally', 'No — it has sometimes been harmful', 'I am not connected to a faith community'] },
        { id: 'ace_faith_scripture',  label: 'Are there Scriptures or spiritual experiences that have been meaningful in your healing journey?',   type: 'textarea', placeholder: 'Share anything that resonates for you…' },
      ],
    },
  ],
};
