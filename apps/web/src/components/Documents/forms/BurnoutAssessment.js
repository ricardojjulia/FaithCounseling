// Ministry & Caregiver Burnout Assessment
// Custom clinical form based on Maslach Burnout Inventory dimensions:
//   Emotional Exhaustion, Depersonalization (Cynicism), and Reduced Personal Accomplishment
// Adapted for ministry, pastoral, caregiving, and faith-based professional contexts

export const BurnoutAssessment = {
  id: 'burnout_assessment',
  title: 'Ministry & Caregiver Burnout Assessment',
  description: 'This assessment helps your counselor understand your levels of exhaustion, compassion fatigue, and sustainability in ministry, caregiving, or helping professions. Based on Maslach Burnout Inventory dimensions.',
  icon: '🕯️',
  estimatedMinutes: 15,
  scorable: false,
  sections: [
    {
      id: 'burnout_role',
      title: 'Role & Ministry Context',
      fields: [
        { id: 'burnout_role_type',        label: 'Your primary role or area of service',                                                                         type: 'checkboxes', options: ['Pastor / Lead minister', 'Associate or assistant pastor', 'Youth or children\'s ministry', 'Counselor or therapist', 'Medical or healthcare professional', 'Social worker', 'Missionary', 'Lay leader or deacon', 'Family caregiver (parent, spouse, child)', 'Nonprofit or humanitarian worker', 'Teacher / Educator', 'Other ministry volunteer', 'Other helping profession'] },
        { id: 'burnout_years',            label: 'How many years have you been in this role or similar roles?',                                                  type: 'radio',    options: ['Less than 1 year', '1–3 years', '3–7 years', '7–15 years', 'More than 15 years'] },
        { id: 'burnout_hours_per_week',   label: 'Approximately how many hours per week do you invest in your ministry or caregiving role?',                     type: 'radio',    options: ['Less than 20 hours', '20–40 hours', '40–60 hours', '60–80 hours', 'More than 80 hours'] },
        { id: 'burnout_support',          label: 'How supported do you feel in your role by leadership, supervisors, or your community?',                        type: 'radio',    options: ['Very well supported', 'Mostly supported', 'Somewhat supported', 'Poorly supported', 'Isolated — carrying this alone'] },
        { id: 'burnout_self_care',        label: 'Do you have regular rhythms of rest, recreation, and self-care?',                                             type: 'radio',    options: ['Yes — consistent and intentional', 'Mostly', 'Inconsistently', 'Rarely', 'No — it feels impossible or selfish'] },
      ],
    },
    {
      id: 'burnout_exhaustion',
      title: 'Emotional Exhaustion',
      description: 'Emotional exhaustion is the core of burnout — feeling depleted, drained, and having nothing left to give. It is not the same as being tired after a busy week; it is a deep, persistent depletion.',
      fields: [
        { id: 'burnout_depleted',         label: 'How often do you feel emotionally depleted or drained by your work?',                                           type: 'radio',    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost constantly'] },
        { id: 'burnout_morning',          label: 'How often do you feel fatigued or dreading the day when you wake up for work?',                                type: 'radio',    options: ['Never', 'Rarely', 'Sometimes (a few times a month)', 'Often (weekly)', 'Almost every day'] },
        { id: 'burnout_frustrated',       label: 'How often do you feel frustrated or at the end of your rope with the people in your care?',                   type: 'radio',    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Frequently — this is a real concern'] },
        { id: 'burnout_giving_more',      label: 'How often do you feel like you have nothing left to give, even though others need more from you?',             type: 'radio',    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always — I am running on empty'] },
        { id: 'burnout_physical',         label: 'What physical symptoms are you experiencing?',                                                                 type: 'checkboxes', options: ['Chronic fatigue', 'Frequent illness', 'Headaches', 'Sleep problems', 'Muscle tension or pain', 'Digestive issues', 'Heart palpitations', 'None significant'] },
        { id: 'burnout_describe_exhaustion', label: 'Describe your experience of exhaustion in your own words.',                                               type: 'textarea', placeholder: 'What does the depletion feel like? When is it worst?' },
      ],
    },
    {
      id: 'burnout_cynicism',
      title: 'Cynicism, Detachment & Compassion Fatigue',
      description: 'Depersonalization (or cynicism) is a distancing response to emotional exhaustion — becoming emotionally detached, cynical, or indifferent toward those you serve. Compassion fatigue is secondary traumatic stress from absorbing others\' pain.',
      fields: [
        { id: 'burnout_detachment',       label: 'How often do you feel emotionally detached or indifferent toward the people you serve?',                        type: 'radio',    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Most of the time'] },
        { id: 'burnout_cynicism',         label: 'Have you noticed increased cynicism about your work, your calling, or the people in your care?',               type: 'radio',    options: ['No', 'Occasionally', 'Yes — more than I am comfortable with', 'Yes — this is significant concern for me'] },
        { id: 'burnout_meaning',          label: 'How meaningful does your work feel right now?',                                                                type: 'radio',    options: ['Deeply meaningful', 'Mostly meaningful', 'Mixed — sometimes meaningful, sometimes not', 'I have lost the sense of meaning', 'It feels pointless'] },
        { id: 'burnout_compassion',       label: 'Do you feel that absorbing others\' trauma, pain, or problems has affected your own wellbeing?',              type: 'radio',    options: ['No', 'Somewhat', 'Yes — significantly', 'Yes — I am experiencing secondary trauma'] },
        { id: 'burnout_resentment',       label: 'Do you carry resentment — toward your role, your organization, the people you serve, or God?',                type: 'radio',    options: ['No', 'Occasionally', 'Yes — some areas', 'Yes — significant resentment I struggle with'] },
        { id: 'burnout_compassion_desc',  label: 'Describe any changes you have noticed in your compassion, care, or empathy over time.',                        type: 'textarea', placeholder: 'How you experience caring for others now versus earlier in your ministry or career…' },
      ],
    },
    {
      id: 'burnout_efficacy',
      title: 'Reduced Accomplishment & Identity',
      description: 'A sense of reduced personal accomplishment — feeling ineffective, like a failure, or doubting whether your work has any impact — is the third dimension of burnout.',
      fields: [
        { id: 'burnout_effectiveness',    label: 'How effective do you feel in your role right now?',                                                             type: 'radio',    options: ['Very effective', 'Mostly effective', 'Mixed', 'Mostly ineffective', 'Like nothing I do matters'] },
        { id: 'burnout_worth',            label: 'Do you measure your personal worth or spiritual value by your productivity and ministry output?',               type: 'radio',    options: ['No', 'Sometimes', 'Yes — more than I should', 'Significantly — my identity is my role'] },
        { id: 'burnout_boundaries',       label: 'How are your professional/ministry boundaries and ability to say no?',                                         type: 'radio',    options: ['Healthy — I have clear boundaries', 'Mostly good', 'Inconsistent — I struggle to say no', 'Poor — I rarely say no', 'I have no effective boundaries'] },
        { id: 'burnout_leaving',          label: 'Have you had thoughts of leaving your ministry, role, or vocation?',                                          type: 'radio',    options: ['No', 'Occasionally', 'Frequently', 'Yes — I am actively considering it'] },
        { id: 'burnout_contributors',     label: 'What factors are most contributing to your burnout?',                                                          type: 'textarea', placeholder: 'Overwork, conflict, lack of support, trauma exposure, unrealistic expectations, financial pressure, family dynamics…' },
      ],
    },
    {
      id: 'burnout_faith',
      title: 'Faith & Sustainability',
      description: '"Come to me, all you who are weary and burdened, and I will give you rest" (Matthew 11:28). Burnout in ministry is a deeply spiritual crisis, not merely a psychological one. These questions explore the intersection of your faith and your exhaustion.',
      fields: [
        { id: 'burnout_faith_calling',    label: 'How connected do you feel to your sense of calling right now?',                                               type: 'radio',    options: ['Very connected — my calling sustains me', 'Mostly connected', 'It has faded', 'I question whether this is still my calling', 'I have lost all sense of calling'] },
        { id: 'burnout_faith_intimacy',   label: 'How is your personal relationship with God? Do you experience spiritual intimacy or only duty?',              type: 'radio',    options: ['Vibrant and close', 'Mostly connected', 'Performing rather than connecting', 'Dry and distant', 'I feel nothing — spiritual numbness'] },
        { id: 'burnout_ministry_god',     label: 'Do you sense God\'s approval, delight, and acceptance as your identity — apart from what you produce?',      type: 'radio',    options: ['Yes, deeply', 'Mostly', 'I know it intellectually but do not feel it', 'No — I feel I must earn his approval', 'I am not sure'] },
        { id: 'burnout_rest_theology',    label: 'What is your theology of rest, Sabbath, and self-care in ministry?',                                          type: 'textarea', placeholder: 'How do you understand the call to rest? What gets in the way?' },
        { id: 'burnout_support_sought',   label: 'Have you been able to share your burnout with anyone (supervisor, elder, peer, spouse, counselor)?',         type: 'radio',    options: ['Yes — openly', 'With a few trusted people', 'Minimally', 'No — I keep this completely private'] },
        { id: 'burnout_prayer_request',   label: 'How can your counselor specifically pray for you in this season?',                                            type: 'textarea', placeholder: 'Optional prayer request…' },
      ],
    },
  ],
};
