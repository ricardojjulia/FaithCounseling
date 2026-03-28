// Rosenberg Self-Esteem Scale (RSES)
// Rosenberg M. Society and the Adolescent Self-Image. Princeton University Press, 1965.
//
// Reversal is handled in options: negatively-worded items have inverted value/label mapping
// so that all items score in the same direction (higher = higher self-esteem).

const RSES_POS = [
  { value: '3', label: 'Strongly agree' },
  { value: '2', label: 'Agree' },
  { value: '1', label: 'Disagree' },
  { value: '0', label: 'Strongly disagree' },
];

// For negatively-worded items: "Strongly agree" = 0 (low self-esteem)
const RSES_NEG = [
  { value: '0', label: 'Strongly agree' },
  { value: '1', label: 'Agree' },
  { value: '2', label: 'Disagree' },
  { value: '3', label: 'Strongly disagree' },
];

// Items 1, 3, 4, 7, 10 are positively worded; items 2, 5, 6, 8, 9 are negatively worded
const RSES_FIELDS = [
  { id: 'rses1',  label: '1. On the whole, I am satisfied with myself.',                                          options: RSES_POS },
  { id: 'rses2',  label: '2. At times I think I am no good at all.',                                             options: RSES_NEG },
  { id: 'rses3',  label: '3. I feel that I have a number of good qualities.',                                     options: RSES_POS },
  { id: 'rses4',  label: '4. I am able to do things as well as most other people.',                               options: RSES_POS },
  { id: 'rses5',  label: '5. I feel I do not have much to be proud of.',                                          options: RSES_NEG },
  { id: 'rses6',  label: '6. I certainly feel useless at times.',                                                 options: RSES_NEG },
  { id: 'rses7',  label: '7. I feel that I\'m a person of worth, at least on an equal plane with others.',       options: RSES_POS },
  { id: 'rses8',  label: '8. I wish I could have more respect for myself.',                                       options: RSES_NEG },
  { id: 'rses9',  label: '9. All in all, I am inclined to feel that I am a failure.',                            options: RSES_NEG },
  { id: 'rses10', label: '10. I take a positive attitude toward myself.',                                         options: RSES_POS },
].map((f) => ({ ...f, type: 'gad_scale' }));

export const RSES_SCORE_IDS = RSES_FIELDS.map((f) => f.id);

export function rsesScoreInterpretation(total) {
  if (total >= 25) return { label: 'High Self-Esteem',    color: 'green',  description: `Score ${total}: High self-esteem. You generally feel positive about yourself and your inherent worth.` };
  if (total >= 15) return { label: 'Normal Self-Esteem',  color: 'teal',   description: `Score ${total}: Within the normal range. Some areas of self-doubt but generally adequate self-regard.` };
  return                  { label: 'Low Self-Esteem',     color: 'red',    description: `Score ${total}: Scores below 15 indicate low self-esteem. Therapeutic support focused on self-worth and identity is recommended.` };
}

export const RosenbergSelfEsteem = {
  id: 'rosenberg_self_esteem',
  title: 'Rosenberg Self-Esteem Scale',
  description: 'A widely used 10-item measure of global self-esteem. There are no right or wrong answers — indicate how strongly you agree or disagree with each statement.',
  icon: '🌱',
  estimatedMinutes: 5,
  scorable: true,
  scoreFields: RSES_SCORE_IDS,
  scoreLabel: 'Self-Esteem Score',
  scoreMax: 30,
  scoreInterpretation: rsesScoreInterpretation,
  sections: [
    {
      id: 'rses_items',
      title: 'Self-Esteem Statements',
      description: 'Please read each statement carefully and indicate how strongly you agree or disagree. Answer based on how you generally feel about yourself, not just today.',
      fields: RSES_FIELDS,
    },
    {
      id: 'rses_context',
      title: 'Self-Image & History',
      fields: [
        { id: 'rses_origin',     label: 'When do you think low or negative feelings about yourself began?',              type: 'radio',    options: ['Childhood', 'Adolescence', 'Early adulthood', 'More recently', 'I generally feel good about myself'] },
        { id: 'rses_messages',   label: 'What messages about your worth or value did you receive growing up?',           type: 'textarea', placeholder: 'Messages from family, peers, cultural or religious background, or formative experiences…' },
        { id: 'rses_comparison', label: 'Do you frequently compare yourself unfavorably to others?',                     type: 'radio',    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often'] },
        { id: 'rses_strengths',  label: 'What are your greatest personal strengths or things you genuinely value about yourself?', type: 'textarea', placeholder: 'Take your time — even small things count…' },
      ],
    },
    {
      id: 'rses_faith',
      title: 'Faith & Identity in Christ',
      description: 'Christian counseling holds that our deepest identity and worth are grounded in being made in the image of God (Gen. 1:27) and being beloved children of God (1 John 3:1). These questions explore how faith shapes your sense of self.',
      fields: [
        { id: 'rses_faith_source',    label: 'How much do you draw your sense of worth from your identity as a child of God?',                   type: 'radio',    options: ['This is my primary source of worth', 'Significantly', 'Somewhat', 'Rarely', 'I struggle to believe this applies to me'] },
        { id: 'rses_imago_dei',       label: 'Do you believe you are made in the image of God (imago Dei) and therefore have inherent dignity?',  type: 'radio',    options: ['Yes, deeply', 'Intellectually yes, but I struggle to feel it', 'I am unsure', 'I find this difficult to believe'] },
        { id: 'rses_spiritual_shame', label: 'Do you carry shame or unworthiness tied to your spiritual life or past failures?',                  type: 'radio',    options: ['No', 'Occasionally', 'Frequently', 'This is a core ongoing struggle for me'] },
        { id: 'rses_faith_scripture', label: 'Are there Scriptures that speak to your worth that are meaningful to you?',                        type: 'textarea', placeholder: 'e.g., Psalm 139:14, 1 John 3:1, Romans 8:1, Ephesians 2:10…' },
      ],
    },
  ],
};
