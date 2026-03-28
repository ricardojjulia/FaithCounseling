// Family Systems Assessment
// Custom clinical form grounded in Bowen Family Systems theory and biblical family theology
// Explores family composition, relational dynamics, triangles, roles, and faith in family context

export const FamilySystemsAssessment = {
  id: 'family_systems',
  title: 'Family Systems Assessment',
  description: 'This assessment explores your family of origin and current family dynamics. Understanding family patterns — how emotional connection, conflict, and roles were modeled — is a powerful tool for personal and relational growth.',
  icon: '🏠',
  estimatedMinutes: 25,
  scorable: false,
  sections: [
    {
      id: 'family_composition',
      title: 'Family Composition',
      description: 'Please describe both your family of origin (the family you grew up in) and your current household.',
      fields: [
        { id: 'family_structure',         label: 'What was your primary family of origin structure growing up?',                                                  type: 'radio',    options: ['Two-parent household (biological parents)', 'Single-parent household (mother primary)', 'Single-parent household (father primary)', 'Blended / stepfamily', 'Raised by grandparents or extended family', 'Foster care or adopted', 'Other'] },
        { id: 'family_siblings',          label: 'How many siblings do you have, and what is your birth order?',                                                 type: 'text',     placeholder: 'e.g., "3 siblings — I am the oldest" or "only child"' },
        { id: 'family_significant_others',label: 'Who else was a significant presence in your family of origin (grandparents, extended family, close family friends)?', type: 'textarea', placeholder: 'Describe anyone who had a significant influence on your upbringing…' },
        { id: 'family_current_household', label: 'Describe your current household.',                                                                             type: 'radio',    options: ['Single / living alone', 'Married, no children', 'Married with children', 'Single parent', 'Cohabiting partner', 'Living with family of origin', 'Other'] },
        { id: 'family_genogram_notes',    label: 'Are there significant patterns across generations (mental illness, addiction, divorce, abuse, trauma, faith)?', type: 'textarea', placeholder: 'What patterns or stories recur across your family history? You may sketch a genogram if helpful.' },
      ],
    },
    {
      id: 'family_relationships',
      title: 'Family Relationships & Emotional Climate',
      description: 'Bowen Family Systems theory emphasizes that the emotional climate of a family — how differentiated, connected, or reactive family members are — shapes each member\'s emotional functioning throughout life.',
      fields: [
        { id: 'family_emotional_climate', label: 'How would you describe the overall emotional climate in your family of origin?',                               type: 'radio',    options: ['Warm, secure, and emotionally open', 'Generally stable with some tension', 'Emotionally distant or shut down', 'Volatile or unpredictable', 'Chaotic or crisis-driven', 'Enmeshed — boundaries were blurry', 'Rigid — emotions were not expressed or discussed'] },
        { id: 'family_affection',         label: 'Was physical and verbal affection expressed in your family of origin?',                                        type: 'radio',    options: ['Freely and warmly', 'Sometimes', 'Rarely', 'Almost never', 'It felt performative or conditional'] },
        { id: 'family_conflict_style',    label: 'How was conflict managed in your family of origin?',                                                          type: 'radio',    options: ['Openly discussed and resolved', 'Avoided — conflict was not addressed', 'Explosive — yelling, anger, or violence', 'Passive-aggressive — tension without direct confrontation', 'Suppressed — denial that problems existed'] },
        { id: 'family_attachment',        label: 'How would you describe your early attachment to your primary caregiver(s)?',                                   type: 'radio',    options: ['Secure — I felt safe, seen, and soothed', 'Anxious — I worried about losing or displeasing my caregiver', 'Avoidant — I learned not to need my caregiver', 'Disorganized — my caregiver was both a source of comfort and fear'] },
        { id: 'family_parental_rel',      label: 'How did your parents relate to each other (if applicable)?',                                                   type: 'radio',    options: ['Loving and secure partnership', 'Generally stable, some tension', 'Frequent conflict', 'Emotionally disconnected', 'Separation or divorce', 'One or both parents absent'] },
        { id: 'family_safety',            label: 'Did you feel emotionally and physically safe in your family of origin?',                                       type: 'radio',    options: ['Yes, consistently', 'Mostly', 'Sometimes', 'Rarely', 'No — I did not feel safe'] },
      ],
    },
    {
      id: 'family_roles',
      title: 'Roles, Patterns & Triangles',
      description: 'Every family system develops roles and patterns. "Triangulation" (when emotional tension between two people gets redirected to a third person) is a key Bowenian concept. Recognizing these patterns is the beginning of differentiation.',
      fields: [
        { id: 'family_role_list',         label: 'Which roles did you take on in your family of origin?',                                                        type: 'checkboxes', options: ['The responsible one / caretaker', 'The peacemaker', 'The achiever / hero', 'The lost child / invisible one', 'The scapegoat / problem child', 'The mascot / comedian', 'The parentified child (taking on parent responsibilities)', 'The mediator between parents', 'The compliant / people-pleaser', 'The rebel', 'The spiritually "good" one'] },
        { id: 'family_role_now',          label: 'Do these roles follow you into your current relationships and family?',                                        type: 'radio',    options: ['Yes — very much so', 'Somewhat', 'I have grown beyond some of them', 'Mostly no'] },
        { id: 'family_triangulation',     label: 'Were you ever pulled into the middle of tension between two other family members (e.g., taking sides between parents, carrying a secret, being a buffer)?', type: 'radio', options: ['No', 'Occasionally', 'Yes — regularly', 'Yes — this was a primary dynamic in my family'] },
        { id: 'family_differentiation',   label: 'How able are you to hold your own views, emotions, and identity when your family is reactive or pressuring you to conform?', type: 'radio', options: ['Very able — I am differentiated', 'Mostly', 'I struggle — I tend to absorb family anxiety or cut off emotionally', 'I fuse — my emotional state mirrors my family\'s'] },
        { id: 'family_cut_off',           label: 'Are there significant estrangements or cut-offs in your family — with a parent, sibling, or extended family member?', type: 'radio', options: ['No', 'Minor distance with some members', 'Yes — with one significant family member', 'Yes — major cut-offs affecting the whole system'] },
        { id: 'family_patterns',          label: 'What patterns or dynamics do you most want to understand or change in your family system?',                    type: 'textarea', placeholder: 'What do you want to be different in your family of origin, your current family, or both?' },
      ],
    },
    {
      id: 'family_faith',
      title: 'Faith in Family Context',
      description: 'The Bible presents family as the primary context for faith formation (Deut. 6:4–9). Faith is also often the deepest source of both family strength and of family wounding. These questions explore how faith has shaped your family system.',
      fields: [
        { id: 'family_faith_role',        label: 'What role did faith or religion play in your family of origin?',                                               type: 'radio',    options: ['Central — we practiced faith actively and authentically', 'Present — we attended church but it was largely cultural', 'Nominal — faith was mentioned but rarely practiced', 'Absent — we had no religious background', 'Conflicted — faith was used to control or wound'] },
        { id: 'family_faith_modeling',    label: 'Did you experience genuine faith modeled by your parents or caregivers?',                                       type: 'radio',    options: ['Yes — I saw authentic faith lived out', 'Partially', 'It was more external or performance-driven', 'No', 'What was modeled was distorted or harmful'] },
        { id: 'family_faith_transmission',label: 'Has your faith been passed to your children or the next generation?',                                          type: 'radio',    options: ['Yes — active faith transmission is a priority', 'I am trying', 'I am uncertain how to do this', 'I have not thought much about this', 'I do not have children'] },
        { id: 'family_faith_wounds',      label: 'Were there ways faith was weaponized or used to harm within your family? (Legalism, spiritual abuse, shame as control, religious trauma)', type: 'radio', options: ['No', 'Minor issues', 'Yes — some religious rules caused harm', 'Yes — significant spiritual harm or abuse'] },
        { id: 'family_redemption',        label: 'Where do you see God at work in your family story — in redemption, healing, or breaking generational patterns?', type: 'textarea', placeholder: 'Are there places you can see grace, restoration, or change across generations?' },
        { id: 'family_vision',            label: 'What kind of family culture do you want to create — or have already created — that reflects the Kingdom of God?', type: 'textarea', placeholder: 'e.g., safety, warmth, honesty, grace, service, discipleship, forgiveness…' },
        { id: 'family_prayer_request',    label: 'How can your counselor pray for you and your family?',                                                          type: 'textarea', placeholder: 'Optional prayer request…' },
      ],
    },
  ],
};
