// PCL-5: PTSD Checklist for DSM-5
// Weathers FW, et al. (2013). National Center for PTSD, VA

const PCL5_OPTIONS = [
  { value: '0', label: 'Not at all' },
  { value: '1', label: 'A little bit' },
  { value: '2', label: 'Moderately' },
  { value: '3', label: 'Quite a bit' },
  { value: '4', label: 'Extremely' },
];

const PCL5_ITEM_LABELS = [
  'Repeated, disturbing, and unwanted memories of the stressful experience',
  'Repeated, disturbing dreams of the stressful experience',
  'Suddenly feeling or acting as if the stressful experience were actually happening again (as if reliving it)',
  'Feeling very upset when something reminded you of the stressful experience',
  'Having strong physical reactions when something reminded you of the stressful experience (heart pounding, trouble breathing, sweating)',
  'Avoiding memories, thoughts, or feelings related to the stressful experience',
  'Avoiding external reminders of the stressful experience (people, places, conversations, activities, objects, or situations)',
  'Trouble remembering important parts of the stressful experience',
  'Having strong negative beliefs about yourself, other people, or the world',
  'Blaming yourself or someone else for the stressful experience or what happened after it',
  'Having strong negative feelings such as fear, horror, anger, guilt, or shame',
  'Loss of interest in activities that you used to enjoy',
  'Feeling distant or cut off from other people',
  'Trouble experiencing positive feelings (being unable to feel happiness or have loving feelings for people close to you)',
  'Irritable behavior, angry outbursts, or acting aggressively',
  'Taking too many risks or doing things that could cause you harm',
  'Being "super-alert," watchful, or on guard',
  'Feeling jumpy or easily startled',
  'Having difficulty concentrating',
  'Trouble falling or staying asleep',
];

export const PCL5_SCORE_IDS = PCL5_ITEM_LABELS.map((_, i) => `pcl${i + 1}`);

const PCL5_FIELDS = PCL5_ITEM_LABELS.map((label, i) => ({
  id: `pcl${i + 1}`,
  label: `${i + 1}. ${label}`,
  type: 'gad_scale',
  options: PCL5_OPTIONS,
}));

export function pcl5ScoreInterpretation(total) {
  if (total >= 33) return { label: 'Probable PTSD',           color: 'red',    description: `Score ${total}: Scores ≥33 suggest probable PTSD consistent with DSM-5 criteria. A structured clinical interview is recommended to confirm diagnosis and inform treatment planning.` };
  if (total >= 20) return { label: 'Significant Symptoms',    color: 'orange', description: `Score ${total}: Significant trauma-related symptoms present below full diagnostic threshold. Trauma-focused therapy (CPT, EMDR, PE) is recommended.` };
  if (total >= 10) return { label: 'Moderate Symptoms',       color: 'yellow', description: `Score ${total}: Moderate post-traumatic stress symptoms. Monitor closely and consider therapeutic support.` };
  return                  { label: 'Minimal Symptoms',        color: 'green',  description: `Score ${total}: Minimal PTSD symptoms at this time. Continue monitoring.` };
}

export const PCL5 = {
  id: 'pcl5',
  title: 'PCL-5 — PTSD Checklist',
  description: 'The PCL-5 is a 20-item self-report measure evaluating DSM-5 symptoms of PTSD. It assesses how much problems related to a stressful experience have bothered you in the past month.',
  icon: '🛡️',
  estimatedMinutes: 10,
  scorable: true,
  scoreFields: PCL5_SCORE_IDS,
  scoreLabel: 'PCL-5 Score',
  scoreMax: 80,
  scoreInterpretation: pcl5ScoreInterpretation,
  sections: [
    {
      id: 'pcl5_event',
      title: 'Identifying a Stressful Event',
      description: 'Before answering the checklist below, please think about a specific stressful or traumatic experience that has been most distressing for you. This is the event you should have in mind as you answer.',
      fields: [
        { id: 'pcl5_event_brief',    label: 'Briefly describe the stressful experience (share only what feels safe to disclose).',               type: 'textarea', placeholder: 'e.g., accident, loss of a loved one, assault, natural disaster, childhood trauma…' },
        { id: 'pcl5_event_when',     label: 'Approximately when did this occur?',                                                                  type: 'radio',    options: ['Less than 1 month ago', '1–6 months ago', '6–12 months ago', '1–5 years ago', 'More than 5 years ago', 'Ongoing or repeated'] },
        { id: 'pcl5_safe_now',       label: 'Are you currently safe from the stressful event or situation?',                                       type: 'radio',    options: ['Yes, I am safe', 'Mostly safe', 'Not entirely safe', 'No — I am still in danger'] },
        { id: 'pcl5_prior_therapy',  label: 'Have you received any trauma-focused therapy previously?',                                            type: 'radio',    options: ['Yes', 'No'] },
      ],
    },
    {
      id: 'pcl5_items',
      title: 'PTSD Symptom Checklist',
      description: 'In the past month, how much have you been bothered by the following problems in relation to the stressful experience you described above?',
      fields: PCL5_FIELDS,
    },
    {
      id: 'pcl5_faith',
      title: 'Faith & Trauma',
      description: 'Trauma can profoundly affect one\'s relationship with God. Lament — crying out to God in raw pain — is a deeply biblical response (Psalms of lament, Lamentations, Job). These questions explore the spiritual dimension of your trauma and healing.',
      fields: [
        { id: 'pcl5_faith_shaken',    label: 'Has the traumatic experience affected your faith or your view of God?',                              type: 'radio',    options: ['Strengthened my faith', 'No significant impact', 'Created questions I wrestle with', 'Significantly shaken my faith', 'I question whether God exists or cares'] },
        { id: 'pcl5_faith_anger',     label: 'Do you experience anger toward God related to this experience?',                                     type: 'radio',    options: ['No', 'Occasionally', 'Frequently', 'This is a significant struggle for me'] },
        { id: 'pcl5_faith_lament',    label: 'Are you able to express your pain, fear, or anger to God (lament)?',                                type: 'radio',    options: ['Yes, I do this regularly', 'Sometimes', 'I find it difficult', 'No — I feel unable or unworthy'] },
        { id: 'pcl5_faith_meaning',   label: 'Have you been able to find any spiritual meaning or redemption alongside this experience?',          type: 'radio',    options: ['Yes, I have found meaning', 'I am beginning to', 'Not yet', 'No — it feels meaningless'] },
        { id: 'pcl5_faith_community', label: 'Has your faith community been a source of comfort or support in your healing journey?',              type: 'radio',    options: ['Yes, very much so', 'Somewhat', 'Minimally', 'No', 'I am not connected to a faith community'] },
        { id: 'pcl5_scripture',       label: 'Are there any Scriptures, prayers, or spiritual practices that have supported your healing?',         type: 'textarea', placeholder: 'Share anything that has brought comfort…' },
      ],
    },
  ],
};
