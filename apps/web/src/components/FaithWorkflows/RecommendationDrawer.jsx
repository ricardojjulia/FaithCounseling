import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  CopyButton,
  Divider,
  Drawer,
  Group,
  Loader,
  Paper,
  Progress,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './engine/types.js';
import { useI18n } from '../../lib/i18nContext.jsx';

// Action templates — deterministic string generators (Phase 3 will call an API)
const ACTION_TEMPLATES = {
  generate_session_agenda: (rec, client) =>
    `SESSION AGENDA — ${client?.firstName ?? 'Client'} ${client?.lastName ?? ''}\n\nFocus: ${rec.title}\n\n1. Check-in (5 min)\n2. Review homework/previous session (10 min)\n3. Primary focus: ${rec.summary} (25 min)\n4. Skills/intervention: [Counselor to determine] (10 min)\n5. Wrap-up + homework assignment (10 min)\n\nNotes: ${rec.rationale}`,

  generate_note_prep: (rec, client) =>
    `PROGRESS NOTE PREP — ${client?.firstName ?? 'Client'} ${client?.lastName ?? ''}\n\nSession focus: ${rec.title}\n\nKey areas to document:\n- ${rec.evidence?.join('\n- ') ?? 'See recommendation details'}\n\nClinical rationale: ${rec.rationale}\n\n${rec.cautions?.length ? 'Cautions: ' + rec.cautions.join('; ') : ''}`,

  suggest_verses: (rec) =>
    `SCRIPTURE SUGGESTIONS — Optional, client-led\n\nThematic fit: ${rec.title}\n\nSuggested passages:\n• Psalm 34:18 — "The Lord is close to the brokenhearted"\n• Philippians 4:6-7 — Anxiety and peace\n• Romans 8:38-39 — Nothing separates us from God's love\n• Isaiah 41:10 — "Do not fear, for I am with you"\n\n${rec.faithNote ?? ''}\n\n⚠ Use only if client has expressed faith integration interest this session.`,

  create_prayer_prompt: (rec) =>
    `PRAYER PROMPT — Optional, client-led\n\nFor: ${rec.title}\n\nOpening prompt:\n"God, I bring [client name] before you today. We acknowledge the weight of [issue]. We ask for wisdom, clarity, and peace as we work together on this..."\n\nThemes to consider: healing, courage, peace, clarity\n\n${rec.faithNote ?? ''}\n\n⚠ Only introduce if client initiates or explicitly requests prayer.`,

  create_cbt_exercise: (rec) =>
    `CBT / GROUNDING EXERCISE\n\nFor: ${rec.title}\n\nSuggested exercise: Thought Record\n\n1. Situation: What happened? When/where?\n2. Automatic thoughts: What went through your mind?\n3. Emotions: What did you feel? (0–100%)\n4. Evidence FOR the thought:\n5. Evidence AGAINST the thought:\n6. Balanced thought: A more balanced way to see this?\n7. Outcome: How do you feel now? (0–100%)\n\nAssign as between-session homework with client agreement.`,

  create_journal_prompt: (rec, client) =>
    `JOURNALING PROMPT — ${client?.firstName ?? 'Client'}\n\nFor: ${rec.title}\n\nPrompt:\n"Describe a moment this week when you noticed [issue]. What were you thinking? What did you feel in your body? What did you do? What would you like to have done differently?"\n\nAlternative (faith-integrated, if applicable):\n"Where did you notice God's presence — or absence — during this moment? What would you want to say to Him about it?"\n\n${rec.faithNote ? '(Faith note: ' + rec.faithNote + ')' : ''}`,

  draft_followup_message: (rec, client) =>
    `FOLLOW-UP MESSAGE DRAFT — Requires counselor review before sending\n\nTo: ${client?.firstName ?? 'Client'} ${client?.lastName ?? ''}\n\nHi ${client?.firstName ?? '[Name]'},\n\nI wanted to reach out to check in. We missed you at our last session and I want to make sure you're doing okay. Please reply to this message or call our office at [phone number] when you're able.\n\nI'm thinking of you and here when you're ready.\n\nWarm regards,\n[Counselor Name]\n\n⚠ Review and personalize before sending. Do not send if in crisis — call directly.`,

  add_reminder_task: (rec) =>
    `REMINDER TASK\n\nTitle: ${rec.title}\nCategory: ${rec.category}\nPriority: ${rec.priority}/10\n\nAction needed: ${rec.summary}\n\nEvidence: ${rec.evidence?.join('; ') ?? 'See recommendation'}\n\n[Add to task list or calendar for follow-up]`,

  create_treatment_plan_update: (rec, client) =>
    `TREATMENT PLAN UPDATE DRAFT — ${client?.firstName ?? 'Client'}\n\nTriggered by: ${rec.title}\n\nSuggested update:\nGoal: [Counselor to define based on: ${rec.summary}]\nIntervention: [Counselor to specify]\nTarget date: [Set realistic timeline]\nMeasurable outcome: [Define observable change]\n\nRationale: ${rec.rationale}\n\n⚠ Requires counselor review and client collaboration before finalizing.`,
};

/**
 * Right-side detail drawer for a selected recommendation.
 */
export default function RecommendationDrawer({ rec, client, opened, onClose }) {
  const { t } = useI18n();
  const [actionOutput, setActionOutput] = useState(null);
  const [actionRunning, setActionRunning] = useState(false);

  if (!rec) return null;

  const color = CATEGORY_COLORS[rec.category] ?? 'gray';
  const icon = CATEGORY_ICONS[rec.category] ?? '•';
  const confidencePct = Math.round(rec.confidence * 100);
  const isSpiritual = rec.category === 'spiritual';

  const handleAction = (actionType) => {
    const template = ACTION_TEMPLATES[actionType];
    if (!template) return;
    setActionRunning(true);
    setActionOutput(null);
    // Simulate async generation (Phase 3 will call /v1/workflows/rationale)
    setTimeout(() => {
      setActionOutput(template(rec, client));
      setActionRunning(false);
    }, 400);
  };

  // All actions for this rec including status ones
  const primaryActions = (rec.actions ?? []).filter(
    (a) => !['mark_complete', 'defer', 'hide'].includes(a),
  );

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text size="xl">{icon}</Text>
          <Title order={4} style={{ lineHeight: 1.2 }}>{rec.title}</Title>
        </Group>
      }
      position="right"
      size="md"
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{ header: { borderBottom: `3px solid var(--mantine-color-${color}-6)` } }}
    >
      <Stack gap="md" pb="xl">
        {/* Spiritual optional notice */}
        {isSpiritual && (
          <Alert color="grape" variant="light" size="xs">
            <Text size="xs">
              <strong>Optional:</strong> This is a faith-integrated suggestion. Only incorporate if the client has expressed openness in this session. Never impose spiritual content.
            </Text>
          </Alert>
        )}

        {/* Priority + confidence */}
        <Group gap="xl">
          <Stack gap={2}>
            <Text size="xs" c="dimmed">{t('workflow.node.priority')}</Text>
            <Badge color={color} variant="light" size="md">{rec.priority} / 10</Badge>
          </Stack>
          <Stack gap={2} style={{ flex: 1 }}>
            <Text size="xs" c="dimmed">{t('workflow.node.confidence')}</Text>
            <Group gap="xs" align="center">
              <Progress value={confidencePct} color={color} size="sm" style={{ flex: 1 }} />
              <Text size="xs" fw={600}>{confidencePct}%</Text>
            </Group>
          </Stack>
        </Group>

        {/* Why surfaced */}
        <Paper withBorder radius="sm" p="sm" style={{ borderLeft: `3px solid var(--mantine-color-${color}-4)` }}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4}>{t('workflow.drawer.whySurfaced')}</Text>
          <Text size="sm">{rec.rationale}</Text>
        </Paper>

        {/* Evidence */}
        {rec.evidence?.length > 0 && (
          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('workflow.drawer.evidence')}</Text>
            {rec.evidence.map((e, i) => (
              <Paper key={i} withBorder radius="sm" p="xs">
                <Text size="sm" ff="monospace">{e}</Text>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Clinical relevance */}
        <Stack gap={4}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('workflow.drawer.clinicalRelevance')}</Text>
          <Text size="sm">{rec.summary}</Text>
        </Stack>

        {/* Faith integration note (only if present) */}
        {rec.faithNote && (
          <>
            <Divider />
            <Stack gap={4}>
              <Text size="xs" fw={700} c="grape" tt="uppercase">{t('workflow.node.faithNote')}</Text>
              <Alert color="grape" variant="light" size="xs">
                <Text size="sm">{rec.faithNote}</Text>
              </Alert>
            </Stack>
          </>
        )}

        {/* Cautions */}
        {rec.cautions?.length > 0 && (
          <>
            <Divider />
            <Stack gap={4}>
              <Text size="xs" fw={700} c="orange" tt="uppercase">{t('workflow.drawer.cautions')}</Text>
              {rec.cautions.map((c, i) => (
                <Alert key={i} color="orange" variant="light" size="xs">
                  <Text size="xs">{c}</Text>
                </Alert>
              ))}
            </Stack>
          </>
        )}

        {/* Documentation note */}
        {rec.docNote && (
          <>
            <Divider />
            <Stack gap={4}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('workflow.drawer.docConsiderations')}</Text>
              <Text size="sm" c="dimmed">{rec.docNote}</Text>
            </Stack>
          </>
        )}

        {/* Actions */}
        {primaryActions.length > 0 && (
          <>
            <Divider />
            <Stack gap={6}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">Actions</Text>
              <Group gap="xs">
                {primaryActions.map((action) => (
                  <Button
                    key={action}
                    size="xs"
                    variant="light"
                    color={isSpiritual && ['suggest_verses', 'create_prayer_prompt'].includes(action) ? 'grape' : 'blue'}
                    onClick={() => handleAction(action)}
                    disabled={actionRunning}
                  >
                    {t(`workflow.action.${action}`)}
                  </Button>
                ))}
              </Group>
            </Stack>
          </>
        )}

        {/* Action output */}
        {actionRunning && (
          <Group justify="center" py="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">{t('workflow.action.running')}</Text>
          </Group>
        )}

        {actionOutput && (
          <Stack gap={6}>
            <Group justify="space-between" align="center">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('workflow.action.result.title')}</Text>
              <Group gap={4}>
                <CopyButton value={actionOutput}>
                  {({ copied, copy }) => (
                    <Button size="compact-xs" variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                      {copied ? '✓ Copied' : t('workflow.action.copy')}
                    </Button>
                  )}
                </CopyButton>
                <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setActionOutput(null)}>
                  {t('workflow.action.close')}
                </Button>
              </Group>
            </Group>
            <Textarea
              value={actionOutput}
              readOnly
              autosize
              minRows={6}
              styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
            />
            <Alert color="yellow" variant="light" size="xs">
              <Text size="xs">{t('workflow.action.output.disclaimer')}</Text>
            </Alert>
          </Stack>
        )}
      </Stack>
    </Drawer>
  );
}
