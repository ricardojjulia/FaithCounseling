// Couples & Relationship Assessment
// Custom clinical form for Christian marriage and couples counseling

export const CouplesAssessment = {
  id: 'couples_assessment',
  title: 'Couples & Relationship Assessment',
  description: 'This assessment helps your counselor understand the dynamics of your relationship. It may be completed individually or together as a couple. Answers are kept confidential within the counseling relationship.',
  icon: '💑',
  estimatedMinutes: 20,
  scorable: false,
  sections: [
    {
      id: 'couples_background',
      title: 'Relationship Background',
      fields: [
        { id: 'couples_length',         label: 'How long have you been in this relationship?',                                                 type: 'radio',    options: ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', 'More than 10 years'] },
        { id: 'couples_status',         label: 'Current relationship status',                                                                  type: 'radio',    options: ['Dating / Engaged', 'Married (newlywed, < 3 years)', 'Married (3–10 years)', 'Married (10+ years)', 'Separated', 'Remarried / Blended Family'] },
        { id: 'couples_children',       label: 'Do you have children together?',                                                               type: 'radio',    options: ['No', 'Yes — biological children', 'Yes — stepchildren', 'Yes — both biological and stepchildren'] },
        { id: 'couples_primary_reason', label: 'What is the primary reason you are seeking counseling now?',                                   type: 'textarea', placeholder: 'What brought you here at this time?' },
        { id: 'couples_previous_counseling', label: 'Have you previously attended couples counseling or therapy?',                            type: 'radio',    options: ['Yes — very helpful', 'Yes — somewhat helpful', 'Yes — not helpful', 'No'] },
        { id: 'couples_goals',          label: 'What are your goals for counseling?',                                                          type: 'textarea', placeholder: 'What would a successful outcome look like for you?' },
      ],
    },
    {
      id: 'couples_communication',
      title: 'Communication Patterns',
      description: 'How you communicate during conflict and stress is one of the most important predictors of relationship health.',
      fields: [
        { id: 'couples_comm_daily',        label: 'How would you describe your day-to-day communication with your partner?',                   type: 'radio',    options: ['Open and connecting', 'Generally good', 'Surface-level / functional only', 'Strained or guarded', 'Very difficult'] },
        { id: 'couples_comm_conflict',     label: 'When conflict arises, what typically happens?',                                             type: 'radio',    options: ['We talk it through calmly', 'One of us tends to pursue, the other withdraws', 'We argue intensely but resolve it', 'Conflict goes unresolved for days', 'We avoid conflict altogether'] },
        { id: 'couples_comm_patterns',     label: 'Which communication patterns do you recognize in your relationship?',                       type: 'checkboxes', options: ['Criticism', 'Contempt or disrespect', 'Defensiveness', 'Stonewalling / shutting down', 'Interrupting', 'Yelling or raised voices', 'Passive-aggression', 'Healthy — we communicate well'] },
        { id: 'couples_comm_feelings',     label: 'Do you feel emotionally safe expressing your true feelings to your partner?',               type: 'radio',    options: ['Almost always', 'Usually', 'Sometimes', 'Rarely', 'Almost never'] },
        { id: 'couples_comm_listening',    label: 'Do you feel genuinely heard and understood by your partner?',                               type: 'radio',    options: ['Almost always', 'Usually', 'Sometimes', 'Rarely', 'Almost never'] },
        { id: 'couples_comm_notes',        label: 'Is there anything else you want your counselor to understand about how you communicate?',   type: 'textarea', placeholder: 'Patterns, history, dynamics…' },
      ],
    },
    {
      id: 'couples_conflict',
      title: 'Conflict & Repair',
      fields: [
        { id: 'couples_conflict_topics',   label: 'Which topics cause the most conflict in your relationship?',                                type: 'checkboxes', options: ['Finances / Money', 'Parenting / Children', 'Intimacy / Sex', 'Extended Family / In-Laws', 'Household Responsibilities', 'Work / Life Balance', 'Faith / Church Involvement', 'Communication Style', 'Trust / Betrayal', 'Lifestyle Differences'] },
        { id: 'couples_conflict_intensity',label: 'How intense does conflict typically become?',                                                type: 'radio',    options: ['Calm disagreements', 'Somewhat heated', 'Significant emotional intensity', 'Explosive / very difficult to manage'] },
        { id: 'couples_repair',            label: 'After a conflict, how well do you repair and reconnect?',                                   type: 'radio',    options: ['Very well — we recover quickly', 'Usually well', 'We recover but it takes time', 'Repair is very difficult for us', 'We rarely repair — resentment builds'] },
        { id: 'couples_trust',             label: 'Is there a significant breach of trust in your relationship (infidelity, deception, etc.)?', type: 'radio',    options: ['No', 'Yes — in the past, now resolved', 'Yes — in the past, still affecting us', 'Yes — this is a current, active issue'] },
        { id: 'couples_trust_details',     label: 'If there has been a breach of trust, please describe (only what feels safe to share).',     type: 'textarea', placeholder: 'Only share what you are comfortable sharing…' },
        { id: 'couples_safety',            label: 'Do you feel physically and emotionally safe with your partner?',                            type: 'radio',    options: ['Yes, completely safe', 'Mostly safe', 'Not entirely safe', 'No — I feel unsafe'] },
      ],
    },
    {
      id: 'couples_intimacy',
      title: 'Intimacy & Connection',
      fields: [
        { id: 'couples_emotional_intimacy',  label: 'How would you rate your emotional intimacy (closeness, vulnerability, knowing each other)?', type: 'radio',    options: ['Very strong', 'Strong', 'Moderate', 'Weak', 'Disconnected'] },
        { id: 'couples_physical_intimacy',   label: 'How satisfied are you with physical intimacy in your relationship?',                         type: 'radio',    options: ['Very satisfied', 'Satisfied', 'Neutral / mixed', 'Dissatisfied', 'This is a significant area of concern'] },
        { id: 'couples_love_languages',      label: 'Which of the following do you most need to feel loved?',                                    type: 'checkboxes', options: ['Words of Affirmation', 'Quality Time', 'Physical Touch', 'Acts of Service', 'Receiving Gifts'] },
        { id: 'couples_friendship',          label: 'How strong is your friendship outside of roles (parents, co-managers, etc.)?',              type: 'radio',    options: ['Very strong — we enjoy each other', 'Good', 'It has faded over time', 'We function as co-parents or roommates', 'We feel like strangers'] },
        { id: 'couples_positive_memories',   label: 'What are your greatest strengths as a couple?',                                              type: 'textarea', placeholder: 'What does your relationship do well? What has kept you together?' },
      ],
    },
    {
      id: 'couples_faith',
      title: 'Faith & Marriage',
      description: 'Christian counseling grounds marriage in covenant love, service, and mutual submission under Christ (Eph. 5:21–33). These questions explore the spiritual dimension of your relationship.',
      fields: [
        { id: 'couples_faith_shared',   label: 'Do you and your partner share the same faith?',                                                  type: 'radio',    options: ['Yes — same tradition and practice', 'Yes — broadly Christian but different traditions', 'Partially — one is more committed', 'No — different faiths', 'Faith is not a significant factor for either of us'] },
        { id: 'couples_faith_together', label: 'Do you pray, worship, or practice faith disciplines together?',                                   type: 'radio',    options: ['Yes, regularly', 'Occasionally', 'Rarely', 'Never'] },
        { id: 'couples_faith_conflict', label: 'Has faith or church involvement been a source of conflict in your relationship?',                 type: 'radio',    options: ['No', 'Occasionally', 'Sometimes', 'It is a significant source of tension'] },
        { id: 'couples_faith_roles',    label: 'How do you understand gender roles and leadership/submission in marriage?',                       type: 'radio',    options: ['Complementarian — husband leads, wife submits', 'Egalitarian — mutual submission and shared leadership', 'Not primarily defined by theology', 'We have different views on this — it creates tension'] },
        { id: 'couples_faith_vision',   label: 'What is your shared vision for your marriage as it relates to your faith and your community?',   type: 'textarea', placeholder: 'What do you believe God intends for your marriage? How do you want faith to shape your family?' },
        { id: 'couples_prayer_request', label: 'Is there anything specific you would like your counselor to pray for regarding your relationship?', type: 'textarea', placeholder: 'Optional prayer request…' },
      ],
    },
  ],
};
