// Spiritual Wellness Inventory
// Custom faith-based assessment for Christian counseling contexts
// Explores spiritual practices, beliefs, community, and growth

export const SpiritualWellnessInventory = {
  id: 'spiritual_wellness',
  title: 'Spiritual Wellness Inventory',
  description: 'This inventory helps your counselor understand the current state of your spiritual life — your practices, beliefs, community, and areas of growth or struggle. There are no right or wrong answers.',
  icon: '✝️',
  estimatedMinutes: 20,
  scorable: false,
  sections: [
    {
      id: 'spiritual_practices',
      title: 'Spiritual Practices',
      description: 'Spiritual disciplines are not ways to earn favor with God but means of grace — ways to position ourselves to receive and respond to God\'s presence.',
      fields: [
        { id: 'sp_prayer_freq',           label: 'How often do you engage in personal prayer?',                                                                  type: 'radio',    options: ['Daily or multiple times daily', 'Most days', 'A few times per week', 'Rarely', 'Not currently'] },
        { id: 'sp_prayer_quality',        label: 'How would you describe the quality of your prayer life?',                                                      type: 'radio',    options: ['Rich and connecting', 'Meaningful, though inconsistent', 'Mostly routine or duty-driven', 'Dry — I feel like I am talking to a wall', 'I do not pray'] },
        { id: 'sp_bible_freq',            label: 'How often do you read or study Scripture?',                                                                    type: 'radio',    options: ['Daily', 'Most days', 'A few times per week', 'Rarely', 'Not currently'] },
        { id: 'sp_bible_engagement',      label: 'When you read Scripture, how would you describe your engagement?',                                             type: 'radio',    options: ['Actively encountering God', 'Informational and meaningful', 'Mostly dutiful', 'Struggling to connect with it', 'I do not read Scripture'] },
        { id: 'sp_practices_active',      label: 'Which spiritual practices do you currently engage in?',                                                        type: 'checkboxes', options: ['Corporate worship / church attendance', 'Personal Bible study', 'Journaling', 'Fasting', 'Meditation / contemplative prayer', 'Lectio Divina or Scripture meditation', 'Sabbath observance', 'Service or volunteering', 'Spiritual direction', 'Accountability group or small group', 'Memorizing Scripture'] },
        { id: 'sp_practices_barriers',    label: 'What barriers make spiritual practices difficult for you?',                                                     type: 'textarea', placeholder: 'Busyness, doubt, emotional pain, distraction, past wounds, shame, disability, family demands…' },
        { id: 'sp_meaningful',            label: 'Which spiritual practice feels most meaningful or life-giving to you right now?',                              type: 'textarea', placeholder: 'And why?' },
      ],
    },
    {
      id: 'spiritual_beliefs',
      title: 'Core Beliefs & Theology',
      description: 'Our beliefs about God, ourselves, and the world shape everything — including how we experience mental and emotional health. These questions explore your core theological convictions.',
      fields: [
        { id: 'sp_god_character',         label: 'How would you describe your current experience of God\'s character?',                                          type: 'radio',    options: ['Loving, good, and present', 'Mostly good, with some doubts', 'Distant but real', 'Unpredictable or demanding', 'Condemning or harsh', 'I am uncertain about God\'s goodness'] },
        { id: 'sp_god_nearness',          label: 'How close or near do you sense God to be right now?',                                                         type: 'radio',    options: ['Very near and present', 'Mostly near', 'Somewhat distant', 'Far away', 'Absent'] },
        { id: 'sp_security',              label: 'How secure do you feel in your relationship with God — that you are accepted and loved regardless of performance?', type: 'radio', options: ['Very secure', 'Mostly secure', 'I often doubt his acceptance of me', 'I feel I must earn his love', 'I do not feel accepted by God'] },
        { id: 'sp_grace_experience',      label: 'How well do you receive and experience God\'s grace, forgiveness, and mercy for yourself?',                    type: 'radio',    options: ['Freely and deeply', 'Mostly well', 'I understand it intellectually but struggle to feel it', 'I find it very difficult to receive grace', 'I do not feel forgiven'] },
        { id: 'sp_theological_tensions',  label: 'Are there theological questions or doubts you are wrestling with?',                                            type: 'textarea', placeholder: 'Questions about God\'s goodness, suffering, the Bible, salvation, prayer, heaven, or other theological tensions…' },
        { id: 'sp_core_beliefs_life',     label: 'What are the most important truths that anchor your faith and life?',                                          type: 'textarea', placeholder: 'Foundational convictions, promises, or Scriptures that are central to your identity…' },
      ],
    },
    {
      id: 'spiritual_community',
      title: 'Community & Accountability',
      description: 'Spiritual health cannot be sustained in isolation. The body of Christ is designed to bear one another\'s burdens (Gal. 6:2) and to spur each other on in love and good deeds (Heb. 10:24–25).',
      fields: [
        { id: 'sp_church_attendance',     label: 'How often do you attend corporate worship with a faith community?',                                             type: 'radio',    options: ['Weekly or more', 'A few times a month', 'Monthly', 'Rarely', 'Not currently attending'] },
        { id: 'sp_church_belonging',      label: 'Do you have a genuine sense of belonging and being known at your church?',                                      type: 'radio',    options: ['Yes — deeply known and connected', 'Mostly', 'Somewhat — more of an attender', 'Minimal connection', 'No sense of belonging'] },
        { id: 'sp_small_group',           label: 'Are you part of a small group, life group, or Bible study?',                                                   type: 'radio',    options: ['Yes — active and meaningful', 'Yes — but engagement is surface-level', 'Not currently, but I want to be', 'No'] },
        { id: 'sp_accountability',        label: 'Do you have anyone who holds you accountable spiritually and to whom you are honest about your struggles?',    type: 'radio',    options: ['Yes — a trusted accountability partner or group', 'Mostly — a few trusted friends', 'Minimally', 'No'] },
        { id: 'sp_spiritual_mentor',      label: 'Do you have a pastor, spiritual director, mentor, or elder who provides spiritual oversight?',                 type: 'radio',    options: ['Yes, actively', 'I have in the past but not currently', 'No, but I want this', 'No'] },
        { id: 'sp_community_wounds',      label: 'Have you experienced hurt, rejection, or spiritual abuse within a faith community?',                           type: 'radio',    options: ['No', 'Minor difficulties', 'Yes — significant wounds', 'Yes — severe or traumatic spiritual abuse'] },
        { id: 'sp_community_wounds_desc', label: 'If yes, please share briefly — only what you are comfortable sharing.',                                        type: 'textarea', placeholder: 'Church wounds, pastoral abuse, legalism, spiritual manipulation, exclusion…' },
      ],
    },
    {
      id: 'spiritual_growth',
      title: 'Spiritual Growth & Discipleship',
      description: 'These questions explore the trajectory of your growth in faith — areas of fruitfulness, struggle, and what you sense God may be inviting you into.',
      fields: [
        { id: 'sp_growth_season',         label: 'How would you describe your current spiritual season?',                                                        type: 'radio',    options: ['A fruitful season of growth', 'A quiet but stable season', 'A dry or desert season', 'A dark night of the soul', 'A season of crisis or loss', 'Returning to faith after a time away'] },
        { id: 'sp_areas_growth',          label: 'Where are you sensing spiritual growth or deepening in your life?',                                            type: 'textarea', placeholder: 'Areas of transformation, fruit, or growing intimacy with God…' },
        { id: 'sp_areas_struggle',        label: 'Where are you struggling spiritually?',                                                                        type: 'textarea', placeholder: 'Habitual sin, emotional barriers, relational patterns, doubt, anger, apathy, distraction, unbelief…' },
        { id: 'sp_sin_patterns',          label: 'Are there any specific sin patterns or habits you are seeking freedom from?',                                  type: 'textarea', placeholder: 'You do not need to share details — just what you feel comfortable addressing in counseling.' },
        { id: 'sp_identity',              label: 'How central is your identity as a child of God to your sense of self?',                                       type: 'radio',    options: ['This is the foundation of who I am', 'Significantly important', 'Somewhat — other identities also define me', 'Rarely — I struggle to claim this', 'Not central to my identity'] },
        { id: 'sp_invitation',            label: 'What do you sense God may be inviting you into in this season of your life?',                                 type: 'textarea', placeholder: 'What might obedience, surrender, or growth look like for you right now?' },
        { id: 'sp_prayer_request',        label: 'How can your counselor specifically pray for your spiritual life?',                                            type: 'textarea', placeholder: 'Optional prayer request…' },
      ],
    },
  ],
};
