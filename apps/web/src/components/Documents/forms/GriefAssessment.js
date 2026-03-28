// Grief & Loss Assessment
// Custom clinical form grounded in biblical theology of grief and lament
// Draws on Worden's Tasks of Mourning and pastoral care frameworks

export const GriefAssessment = {
  id: 'grief_assessment',
  title: 'Grief & Loss Assessment',
  description: 'Grief is a natural response to loss of any kind. This assessment helps your counselor understand your experience of loss, where you are in your grief journey, and how your faith is being affected.',
  icon: '🕊️',
  estimatedMinutes: 20,
  scorable: false,
  sections: [
    {
      id: 'grief_loss_history',
      title: 'Loss History',
      description: 'Please share about the most significant loss or losses you have experienced. This may be a death, but grief also arises from relationship losses, divorce, job loss, health, miscarriage, dreams unrealized, or other major transitions.',
      fields: [
        { id: 'grief_primary_loss',     label: 'Please describe the primary loss you are experiencing or grieving.',                                                  type: 'textarea', placeholder: 'Who or what was lost, and when?' },
        { id: 'grief_loss_type',        label: 'What kind of loss was this?',                                                                                         type: 'checkboxes', options: ['Death of a spouse or partner', 'Death of a child', 'Death of a parent', 'Death of a sibling or family member', 'Death of a close friend', 'Miscarriage or infant loss', 'Divorce or relationship ending', 'Loss of health or chronic illness', 'Loss of employment or career', 'Loss of identity or purpose', 'Estrangement from family or friends', 'Loss of a pregnancy or infertility', 'Loss related to trauma or violence', 'Loss of faith or spiritual identity', 'Other significant loss'] },
        { id: 'grief_how_long',         label: 'How long ago did this loss occur?',                                                                                    type: 'radio',    options: ['Less than 1 month', '1–3 months', '3–6 months', '6–12 months', '1–2 years', 'More than 2 years', 'This is a cumulative or ongoing loss'] },
        { id: 'grief_circumstances',    label: 'Were the circumstances of the loss sudden, violent, traumatic, or by suicide?',                                        type: 'radio',    options: ['No — it was an expected or peaceful loss', 'Somewhat unexpected', 'Yes — sudden or unexpected', 'Yes — traumatic, violent, or accidental', 'Yes — by suicide', 'Yes — after long illness'] },
        { id: 'grief_other_losses',     label: 'Have you experienced other significant losses in your life, past or present?',                                         type: 'textarea', placeholder: 'Additional losses that may be layering with the current grief…' },
      ],
    },
    {
      id: 'grief_experience',
      title: 'Grief Experience',
      description: 'Grief affects us emotionally, physically, cognitively, relationally, and spiritually. There is no timeline or "right" way to grieve.',
      fields: [
        { id: 'grief_emotions',         label: 'Which emotions are most present for you in your grief?',                                                               type: 'checkboxes', options: ['Sadness', 'Numbness or shock', 'Anger', 'Guilt or regret', 'Relief', 'Longing / yearning', 'Loneliness', 'Fear', 'Anxiety', 'Confusion', 'Emptiness', 'Depression', 'Shame'] },
        { id: 'grief_physical',         label: 'Which physical symptoms are you experiencing?',                                                                        type: 'checkboxes', options: ['Fatigue', 'Sleep disturbances', 'Changes in appetite', 'Crying spells', 'Physical heaviness', 'Chest pain or tightness', 'Headaches', 'Weakened immune system', 'No significant physical symptoms'] },
        { id: 'grief_daily_function',   label: 'How much is your grief affecting your daily functioning?',                                                             type: 'radio',    options: ['Minimally — I function well', 'Somewhat — some areas are impacted', 'Moderately — most days are difficult', 'Severely — I struggle to function', 'I am unable to function normally'] },
        { id: 'grief_support',          label: 'Do you have people in your life who support you in your grief?',                                                       type: 'radio',    options: ['Yes, a strong support network', 'Some support', 'Limited support', 'Mostly alone in this', 'No support'] },
        { id: 'grief_narrative',        label: 'Describe what your grief experience has been like. What has been the hardest part?',                                   type: 'textarea', placeholder: 'Share as much or as little as you like…' },
        { id: 'grief_avoidance',        label: 'Are there aspects of the loss you find yourself avoiding (places, people, memories, objects)?',                        type: 'textarea', placeholder: 'What are you avoiding? Why?' },
      ],
    },
    {
      id: 'grief_complicated',
      title: 'Complicated Grief Indicators',
      description: 'Complicated grief (also called prolonged grief disorder) involves persistent, intense grief that significantly impairs functioning. These questions help your counselor recognize if additional specialized support is needed.',
      fields: [
        { id: 'grief_duration_intense',   label: 'Has intense grief persisted for more than one year with little improvement?',                                        type: 'radio',    options: ['Yes', 'No', 'Not applicable — recent loss'] },
        { id: 'grief_preoccupation',      label: 'Do you find yourself preoccupied with the person or thing lost, unable to engage with daily life?',                  type: 'radio',    options: ['Not at all', 'Occasionally', 'Frequently', 'Almost constantly'] },
        { id: 'grief_bitterness',         label: 'Do you carry ongoing bitterness, anger, or resentment connected to the loss?',                                       type: 'radio',    options: ['No', 'Occasionally', 'Often', 'This is consuming me'] },
        { id: 'grief_purposelessness',    label: 'Do you struggle to find meaning or purpose now that you have experienced this loss?',                                type: 'radio',    options: ['No', 'Sometimes', 'Frequently', 'I feel my life has no purpose now'] },
        { id: 'grief_identity',           label: 'Do you feel that your identity is fundamentally shattered or that you do not know who you are without the person or thing lost?', type: 'radio', options: ['No', 'Somewhat', 'Yes — significantly', 'Deeply so'] },
        { id: 'grief_death_wish',         label: 'Do you have thoughts of wanting to die or be with the person who died?',                                             type: 'radio',    options: ['No', 'Briefly and passively', 'Sometimes', 'Frequently — please discuss this with your counselor'] },
      ],
    },
    {
      id: 'grief_faith',
      title: 'Faith & Lament',
      description: 'The Bible is full of grief. The Psalms of lament (Psalms 22, 34, 77, 88), the book of Lamentations, and Job are all theology born out of suffering. Jesus wept (John 11:35). These questions explore the spiritual dimension of your grief.',
      fields: [
        { id: 'grief_faith_impact',      label: 'How has this loss affected your faith?',                                                                               type: 'radio',    options: ['Deepened my faith', 'My faith has carried me', 'Mixed — some strengthening and some doubt', 'Created significant doubt or anger at God', 'Led me to abandon or step back from faith'] },
        { id: 'grief_faith_anger',       label: 'Do you experience anger at God or toward the circumstances of this loss?',                                             type: 'radio',    options: ['No', 'Occasionally', 'Yes — I am very angry at God', 'Yes — and I feel guilty about that anger'] },
        { id: 'grief_lament',            label: 'Are you able to bring your grief to God — to cry out, lament, or be honest with him in prayer?',                      type: 'radio',    options: ['Yes, I do this freely', 'Sometimes', 'I find it difficult', 'No — I feel unable, undeserving, or too distant from God to do this'] },
        { id: 'grief_theology',          label: 'Are there any theological questions this loss has raised for you?',                                                    type: 'textarea', placeholder: 'e.g., "Why did God allow this?" "Is God good?" "What happens after death?" "Does prayer matter?"…' },
        { id: 'grief_hope',              label: 'Do you have hope — in Christ\'s resurrection or otherwise — that speaks into your grief?',                            type: 'radio',    options: ['Yes — the resurrection gives me real hope', 'It is a fragile hope but it is there', 'I am struggling to find hope', 'I cannot feel any hope right now'] },
        { id: 'grief_faith_community',   label: 'Has your faith community grieved with you?',                                                                          type: 'radio',    options: ['Yes — they have wept with me (Rom. 12:15)', 'Somewhat — some support', 'Minimally', 'No — I have felt alone', 'I am not part of a faith community'] },
        { id: 'grief_scripture',         label: 'Are there Scriptures, prayers, or spiritual practices that have been a source of comfort or lament?',                  type: 'textarea', placeholder: 'Share any passages that have helped — even if only in a small way…' },
        { id: 'grief_prayer_request',    label: 'How specifically can your counselor pray for you in your grief?',                                                      type: 'textarea', placeholder: 'Optional prayer request…' },
      ],
    },
  ],
};
