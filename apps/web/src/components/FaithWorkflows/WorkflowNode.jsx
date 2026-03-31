import { Badge, Button, Group, Paper, Stack, Text, Tooltip, Progress } from '@mantine/core';
import { CATEGORY_COLORS, CATEGORY_ICONS, SAFETY_LOCK_THRESHOLD } from './engine/types.js';
import { useI18n } from '../../lib/i18nContext.jsx';

const ACTION_COLORS = {
  generate_session_agenda:      'blue',
  generate_note_prep:           'blue',
  suggest_verses:               'grape',
  create_prayer_prompt:         'grape',
  create_cbt_exercise:          'cyan',
  create_journal_prompt:        'cyan',
  draft_followup_message:       'gray',
  add_reminder_task:            'gray',
  create_treatment_plan_update: 'orange',
  mark_complete:                'green',
  defer:                        'gray',
  hide:                         'gray',
};

/**
 * A single recommendation node card on the workflow canvas.
 *
 * Props:
 *   rec         — Recommendation object
 *   selected    — bool, whether this node is selected
 *   onSelect    — () => void
 *   onAction    — (actionType: string) => void
 *   onStatusChange — (status: 'complete'|'deferred'|'hidden') => void
 */
export default function WorkflowNode({ rec, selected, onSelect, onAction, onStatusChange }) {
  const { t } = useI18n();
  const color = CATEGORY_COLORS[rec.category] ?? 'gray';
  const icon = CATEGORY_ICONS[rec.category] ?? '•';
  const isSpiritual = rec.category === 'spiritual';
  const isSafetyLocked = rec.priority >= SAFETY_LOCK_THRESHOLD;
  const isComplete = rec.status === 'complete';
  const isDeferred = rec.status === 'deferred';
  const isHidden = rec.status === 'hidden';

  if (isHidden) return null;

  const confidencePct = Math.round(rec.confidence * 100);
  const priorityLabel = rec.priority >= 9 ? 'Critical' : rec.priority >= 7 ? 'High' : rec.priority >= 5 ? 'Medium' : 'Low';

  // Primary actions (non-status-change)
  const primaryActions = (rec.actions ?? []).filter(
    (a) => !['mark_complete', 'defer', 'hide'].includes(a),
  ).slice(0, 3);

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      onClick={onSelect}
      style={{
        cursor: 'pointer',
        borderLeft: `4px solid var(--mantine-color-${color}-6)`,
        opacity: isComplete || isDeferred ? 0.6 : 1,
        outline: selected ? `2px solid var(--mantine-color-${color}-4)` : 'none',
        outlineOffset: 2,
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {/* Spiritual optional label */}
      {isSpiritual && (
        <Badge
          size="xs"
          color="grape"
          variant="dot"
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          {t('workflow.optional')}
        </Badge>
      )}

      <Stack gap={6}>
        {/* Header row */}
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Text size="lg" style={{ lineHeight: 1, flexShrink: 0 }}>{icon}</Text>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" align="center" wrap="nowrap">
              <Text fw={600} size="sm" style={{ flex: 1 }} lineClamp={2}>
                {isComplete && '✓ '}{rec.title}
              </Text>
              {isSafetyLocked && (
                <Tooltip label="Cannot be hidden or deferred — safety priority" withArrow>
                  <Badge size="xs" color="red" variant="filled">🔒</Badge>
                </Tooltip>
              )}
            </Group>
            <Text size="xs" c="dimmed" lineClamp={2}>{rec.summary}</Text>
          </Stack>
        </Group>

        {/* Priority + confidence row */}
        <Group gap="md" align="center">
          <Group gap={4} align="center">
            <Text size="xs" c="dimmed">{t('workflow.node.priority')}:</Text>
            <Badge size="xs" color={color} variant="light">{priorityLabel} ({rec.priority})</Badge>
          </Group>
          <Group gap={4} align="center" style={{ flex: 1 }}>
            <Text size="xs" c="dimmed">{t('workflow.node.confidence')}:</Text>
            <Progress value={confidencePct} size="xs" color={color} style={{ flex: 1, maxWidth: 60 }} />
            <Text size="xs" c="dimmed">{confidencePct}%</Text>
          </Group>
        </Group>

        {/* Evidence chips */}
        {rec.evidence?.length > 0 && (
          <Group gap={4}>
            {rec.evidence.slice(0, 2).map((e, i) => (
              <Badge key={i} size="xs" color="gray" variant="outline">{e}</Badge>
            ))}
          </Group>
        )}

        {/* Primary action buttons */}
        {primaryActions.length > 0 && (
          <Group gap={4}>
            {primaryActions.map((action) => (
              <Button
                key={action}
                size="compact-xs"
                variant="light"
                color={ACTION_COLORS[action] ?? 'blue'}
                onClick={(e) => { e.stopPropagation(); onAction?.(action); }}
              >
                {t(`workflow.action.${action}`)}
              </Button>
            ))}
          </Group>
        )}

        {/* Status controls */}
        <Group gap={4} justify="flex-end">
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
          >
            {t('workflow.node.viewDetails')}
          </Button>
          {!isComplete && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="green"
              onClick={(e) => { e.stopPropagation(); onStatusChange?.('complete'); }}
            >
              {t('workflow.action.mark_complete')}
            </Button>
          )}
          {!isDeferred && !isSafetyLocked && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              onClick={(e) => { e.stopPropagation(); onStatusChange?.('deferred'); }}
            >
              {t('workflow.action.defer')}
            </Button>
          )}
          {!isSafetyLocked && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              onClick={(e) => { e.stopPropagation(); onStatusChange?.('hidden'); }}
            >
              {t('workflow.action.hide')}
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
