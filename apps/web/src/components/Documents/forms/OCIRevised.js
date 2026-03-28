// OCI-R: Obsessive-Compulsive Inventory — Revised
// Foa EB, Huppert JD, Leiberg S, et al. Psychol Assess 2002;14(4):485–496

const OCI_OPTIONS = [
  { value: '0', label: 'Not at all' },
  { value: '1', label: 'A little' },
  { value: '2', label: 'Moderately' },
  { value: '3', label: 'A lot' },
  { value: '4', label: 'Extremely' },
];

const OCI_ITEM_LABELS = [
  'I have saved up so many things that they get in the way.',
  'I check things more often than necessary.',
  'I get upset if objects are not arranged properly.',
  'I feel compelled to count while I am doing things.',
  'I find it difficult to touch an object when I know it has been touched by strangers or certain people.',
  'I find it difficult to control my own thoughts.',
  'I collect things I do not need.',
  'I repeatedly check doors, windows, drawers, etc.',
  'I get upset if others change the way I have arranged things.',
  'I feel I have to repeat certain numbers.',
  'I sometimes have to wash or clean myself simply because I feel contaminated.',
  'I am upset by unpleasant thoughts that come into my mind against my will.',
  'I avoid throwing things away because I am afraid I might need them later.',
  'I repeatedly check gas and water taps and light switches after turning them off.',
  'I need things to be arranged in a particular way.',
  'I feel that there are good and bad numbers.',
  'I wash my hands more often and longer than necessary.',
  'I frequently get nasty thoughts and have difficulty getting rid of them.',
];

export const OCI_SCORE_IDS = OCI_ITEM_LABELS.map((_, i) => `oci${i + 1}`);

const OCI_FIELDS = OCI_ITEM_LABELS.map((label, i) => ({
  id: `oci${i + 1}`,
  label: `${i + 1}. ${label}`,
  type: 'gad_scale',
  options: OCI_OPTIONS,
}));

export function ociScoreInterpretation(total) {
  if (total >= 40) return { label: 'Severe OCD Symptoms',   color: 'red',    description: `Score ${total}: Severe obsessive-compulsive symptoms. Comprehensive OCD evaluation and ERP (Exposure and Response Prevention) therapy are strongly recommended.` };
  if (total >= 21) return { label: 'OCD Likely',            color: 'orange', description: `Score ${total}: Scores ≥21 are above the published clinical cutpoint for OCD. A formal clinical evaluation and specialized OCD treatment are recommended.` };
  if (total >= 10) return { label: 'Subclinical Features',  color: 'yellow', description: `Score ${total}: Some obsessive-compulsive features below clinical threshold. Monitor and discuss with your counselor.` };
  return                  { label: 'Minimal Symptoms',      color: 'green',  description: `Score ${total}: Minimal OCD symptoms.` };
}

export const OCIRevised = {
  id: 'oci_revised',
  title: 'OCI-R — OCD Inventory (Revised)',
  description: 'The OCI-R is an 18-item self-report measure of obsessive-compulsive symptoms across six dimensions: washing, checking, ordering, obsessing, hoarding, and neutralizing.',
  icon: '🔄',
  estimatedMinutes: 7,
  scorable: true,
  scoreFields: OCI_SCORE_IDS,
  scoreLabel: 'OCI-R Score',
  scoreMax: 72,
  scoreInterpretation: ociScoreInterpretation,
  sections: [
    {
      id: 'oci_items',
      title: 'OCD Symptom Checklist',
      description: 'How much were you distressed or bothered by each of the following experiences during the past month?',
      fields: OCI_FIELDS,
    },
    {
      id: 'oci_context',
      title: 'Impact & History',
      fields: [
        { id: 'oci_time_daily',       label: 'On average, how much time per day do you spend on obsessive thoughts or compulsive behaviors?',  type: 'radio',    options: ['Less than 1 hour', '1–3 hours', '3–8 hours', 'More than 8 hours'] },
        { id: 'oci_interference',     label: 'How much do these experiences interfere with your daily functioning?',                             type: 'radio',    options: ['Not at all', 'Mild interference', 'Moderate interference', 'Severe interference', 'Completely disabling'] },
        { id: 'oci_avoidance',        label: 'Describe situations, objects, or activities you avoid because of OCD fears.',                      type: 'textarea', placeholder: 'What do you avoid and why…' },
        { id: 'oci_prev_treatment',   label: 'Have you received previous treatment for OCD or intrusive thoughts?',                             type: 'radio',    options: ['Yes', 'No'] },
      ],
    },
    {
      id: 'oci_faith',
      title: 'Faith Dimension',
      description: '"Scrupulosity" is a form of OCD characterized by religious obsessions and moral guilt. The fear of sin, blasphemy, or offending God becomes overwhelming and treatment-resistant without proper care. These questions explore whether faith intersects with your OCD symptoms.',
      fields: [
        { id: 'oci_scrupulosity',    label: 'Do any of your obsessions involve themes of sin, moral failure, blasphemy, or religious impurity?',          type: 'radio',    options: ['No', 'Occasionally', 'Frequently', 'This is a central focus of my OCD'] },
        { id: 'oci_ritual_prayer',   label: 'Do you feel compelled to confess repeatedly, pray in rigid sequences, or perform religious rituals to reduce anxiety?', type: 'radio', options: ['No', 'Sometimes', 'Often', 'Very frequently'] },
        { id: 'oci_faith_forgive',   label: 'Do these thoughts and compulsions affect your ability to experience God\'s forgiveness or grace?',           type: 'radio',    options: ['No', 'Somewhat', 'Significantly', 'I cannot feel forgiven or accepted by God'] },
        { id: 'oci_faith_teaching',  label: 'Has your faith community\'s teaching been a source of comfort, or has it contributed to OCD symptoms?',      type: 'radio',    options: ['Significant comfort', 'Generally helpful', 'Neutral', 'Sometimes worsens symptoms', 'Significantly worsens symptoms'] },
        { id: 'oci_faith_grace',     label: 'What do you believe God says about your intrusive thoughts and compulsive behaviors?',                        type: 'textarea', placeholder: 'Share your understanding of grace, forgiveness, and your relationship with God in light of these struggles…' },
      ],
    },
  ],
};
