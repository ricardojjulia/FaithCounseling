// AUDIT: Alcohol Use Disorders Identification Test
// Babor TF, et al. (2001). AUDIT: The Alcohol Use Disorders Identification Test. WHO Publication.
//
// Q1–Q8 use 0–4 scoring; Q9–Q10 use 0/2/4 scoring.
// Using gad_scale type with numeric string values so the standard scoreFields sum works correctly.

const AUDIT_FREQ = [
  { value: '0', label: 'Never' },
  { value: '1', label: 'Monthly or less' },
  { value: '2', label: '2–4 times per month' },
  { value: '3', label: '2–3 times per week' },
  { value: '4', label: '4 or more times per week' },
];

const AUDIT_AMOUNT = [
  { value: '0', label: '1 or 2 drinks' },
  { value: '1', label: '3 or 4 drinks' },
  { value: '2', label: '5 or 6 drinks' },
  { value: '3', label: '7 to 9 drinks' },
  { value: '4', label: '10 or more drinks' },
];

const AUDIT_BINGE_FREQ = [
  { value: '0', label: 'Never' },
  { value: '1', label: 'Less than monthly' },
  { value: '2', label: 'Monthly' },
  { value: '3', label: 'Weekly' },
  { value: '4', label: 'Daily or almost daily' },
];

// For Q9 and Q10 — values are 0, 2, 4 (not contiguous — still works with parseInt)
const AUDIT_YN_CONCERN = [
  { value: '0', label: 'No' },
  { value: '2', label: 'Yes, but not in the past year' },
  { value: '4', label: 'Yes, during the past year' },
];

export const AUDIT_SCORE_IDS = ['aud1','aud2','aud3','aud4','aud5','aud6','aud7','aud8','aud9','aud10'];

export function auditScoreInterpretation(total) {
  if (total >= 20) return { label: 'Likely Dependence',          color: 'red',    description: `Score ${total}: Scores ≥20 suggest alcohol dependence. Referral for specialist assessment and treatment is strongly recommended.` };
  if (total >= 16) return { label: 'Harmful Use',                color: 'orange', description: `Score ${total}: Scores 16–19 indicate harmful alcohol use. Brief counseling intervention and close monitoring are warranted.` };
  if (total >= 8)  return { label: 'Hazardous Use',              color: 'yellow', description: `Score ${total}: Scores 8–15 indicate hazardous or harmful drinking. Education about alcohol risks and a brief intervention are appropriate.` };
  return                  { label: 'Low Risk / Abstinence',      color: 'green',  description: `Score ${total}: Scores 0–7 indicate low-risk alcohol use or abstinence. Continue monitoring.` };
}

export const AUDIT = {
  id: 'audit',
  title: 'AUDIT — Alcohol Use Screening',
  description: 'The Alcohol Use Disorders Identification Test (AUDIT) is a WHO-validated 10-item tool to identify hazardous and harmful alcohol use. One standard drink = 12 oz beer, 5 oz wine, or 1.5 oz spirits.',
  icon: '🍂',
  estimatedMinutes: 5,
  scorable: true,
  scoreFields: AUDIT_SCORE_IDS,
  scoreLabel: 'AUDIT Score',
  scoreMax: 40,
  scoreInterpretation: auditScoreInterpretation,
  sections: [
    {
      id: 'audit_use',
      title: 'Alcohol Consumption',
      description: 'Please answer these questions about your drinking over the past year. One standard drink = 12 oz regular beer, 5 oz wine, or 1.5 oz spirits.',
      fields: [
        { id: 'aud1', label: '1. How often do you have a drink containing alcohol?',                                                                                                type: 'gad_scale', options: AUDIT_FREQ },
        { id: 'aud2', label: '2. How many drinks containing alcohol do you have on a typical day when you are drinking?',                                                           type: 'gad_scale', options: AUDIT_AMOUNT },
        { id: 'aud3', label: '3. How often do you have six or more drinks on one occasion?',                                                                                        type: 'gad_scale', options: AUDIT_BINGE_FREQ },
        { id: 'aud4', label: '4. How often in the past year have you found that you were not able to stop drinking once you had started?',                                           type: 'gad_scale', options: AUDIT_BINGE_FREQ },
        { id: 'aud5', label: '5. How often in the past year have you failed to do what was normally expected of you because of drinking?',                                          type: 'gad_scale', options: AUDIT_BINGE_FREQ },
        { id: 'aud6', label: '6. How often in the past year have you needed a first drink in the morning to get yourself going after a heavy drinking session?',                    type: 'gad_scale', options: AUDIT_BINGE_FREQ },
        { id: 'aud7', label: '7. How often in the past year have you had a feeling of guilt or remorse after drinking?',                                                            type: 'gad_scale', options: AUDIT_BINGE_FREQ },
        { id: 'aud8', label: '8. How often in the past year have you been unable to remember what happened the night before because of drinking?',                                   type: 'gad_scale', options: AUDIT_BINGE_FREQ },
        { id: 'aud9', label: '9. Have you or someone else been injured as a result of your drinking?',                                                                              type: 'gad_scale', options: AUDIT_YN_CONCERN },
        { id: 'aud10', label: '10. Has a relative, friend, doctor, or other health worker been concerned about your drinking or suggested you cut down?',                           type: 'gad_scale', options: AUDIT_YN_CONCERN },
      ],
    },
    {
      id: 'audit_context',
      title: 'Context & History',
      fields: [
        { id: 'aud_family_hx',   label: 'Is there a family history of alcohol problems?',                                                      type: 'radio',    options: ['Yes', 'No', 'Unsure'] },
        { id: 'aud_reason',      label: 'What role does alcohol play in your life?',                                                           type: 'textarea', placeholder: 'Social drinking, stress relief, habit, coping with pain, other…' },
        { id: 'aud_abstinence',  label: 'Have you had periods of abstinence from alcohol?',                                                    type: 'radio',    options: ['I have never drunk', 'Yes, and I would like to again', 'I have tried but found it difficult', 'No'] },
        { id: 'aud_prev_tx',     label: 'Have you received treatment related to alcohol use?',                                                 type: 'radio',    options: ['Yes', 'No'] },
      ],
    },
    {
      id: 'audit_faith',
      title: 'Faith Dimension',
      description: 'Many Christian traditions address sobriety as a spiritual matter (Eph. 5:18; 1 Cor. 6:19–20; Prov. 20:1). These questions explore the relationship between your faith and your alcohol use.',
      fields: [
        { id: 'aud_faith_view',       label: 'How does your faith perspective shape your view of alcohol use?',                                type: 'radio',    options: ['Abstinence is a personal conviction', 'Moderation is my approach', 'I have not thought about it spiritually', 'My use conflicts with my faith values and I am troubled by this'] },
        { id: 'aud_faith_shame',      label: 'Do you carry spiritual shame, guilt, or condemnation related to your drinking?',                 type: 'radio',    options: ['No', 'Occasionally', 'Often', 'Yes — significantly'] },
        { id: 'aud_faith_community',  label: 'Does your faith community provide support, accountability, or resources related to sobriety?',   type: 'radio',    options: ['Yes, very much so', 'Somewhat', 'This topic is not addressed', 'No'] },
        { id: 'aud_faith_scripture',  label: 'Are there Scriptures or spiritual practices that encourage you toward sobriety or temperance?',  type: 'textarea', placeholder: 'Share any passages or practices that are meaningful to you…' },
      ],
    },
  ],
};
