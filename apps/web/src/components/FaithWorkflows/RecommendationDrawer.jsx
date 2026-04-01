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
  TextInput,
} from '@mantine/core';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './engine/types.js';
import { useI18n } from '../../lib/i18nContext.jsx';
import { renderActionContent, AI_DISCLAIMER } from './engine/contentTemplates.js';

const SAFETY_LOCK_THRESHOLD = 9;

/**
 * Right-side detail drawer for a selected recommendation.
 *
 * Props:
 *   rec                — the Recommendation object
 *   client             — client record (for name interpolation)
 *   allRecommendations — full list for session agenda generation
 *   opened             — drawer open state
 *   onClose            — close callback
 *   onStatusChange     — (rec, status, deferredUntil?) => void
 *   onAction           — (rec, actionType) => void
 */
export default function RecommendationDrawer({
  rec,
  client,
  allRecommendations = [],
  opened,
  onClose,
  onStatusChange,
  onAction,
}) {
  const { t } = useI18n();
  const [actionOutput, setActionOutput] = useState(null);
  const [actionRunning, setActionRunning] = useState(false);
  const [deferDate, setDeferDate] = useState('');
  const [showDeferInput, setShowDeferInput] = useState(false);

  if (!rec) return null;

  const color = CATEGORY_COLORS[rec.category] ?? 'gray';
  const icon = CATEGORY_ICONS[rec.category] ?? '•';
  const confidencePct = Math.round(rec.confidence * 100);
  const isSpiritual = rec.category === 'spiritual';
  const isSafetyLocked = rec.priority >= SAFETY_LOCK_THRESHOLD;

  const clientName = [client?.firstName, client?.lastName].filter(Boolean).join(' ') || 'Client';
  const clientFirstName = client?.firstName || '';

  const handleContentAction = (actionType) => {
    setActionRunning(true);
    setActionOutput(null);
    // Render template (synchronous, but wrapped in timeout for perceived responsiveness)
    setTimeout(() => {
      const content = renderActionContent(actionType, rec, {
        clientName,
        clientFirstName,
        allRecommendations,
      });
      setActionOutput(content ?? `No template available for action: ${actionType}`);
      setActionRunning(false);
    }, 200);
  };

  const handleMarkComplete = () => {
    onStatusChange?.(rec, 'complete');
    onClose();
  };

  const handleHide = () => {
    onStatusChange?.(rec, 'hidden');
    onClose();
  };

  const handleDefer = () => {
    if (!showDeferInput) {
      setShowDeferInput(true);
      return;
    }
    if (!deferDate) return;
    onStatusChange?.(rec, 'deferred', deferDate);
    setShowDeferInput(false);
    setDeferDate('');
    onClose();
  };

  const handleAddReminder = () => {
    // POST /v1/reminders with pre-filled data
    fetch('/api/v1/reminders', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: rec.title,
        notes: rec.summary,
        category: rec.category,
        clientId: client?.id,
        dueAt: null,
      }),
    }).catch(() => {});
    // Also show a note prep so the counselor knows what the reminder is for
    handleContentAction('generate_note_prep');
  };

  // Status actions are always shown; content actions come from the rec's actions array
  const contentActions = (rec.actions ?? []).filter(
    (a) => !['mark_complete', 'defer', 'hide', 'add_reminder_task'].includes(a),
  );

  const currentStatus = rec.status ?? 'pending';

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

        {/* Safety lock notice */}
        {isSafetyLocked && (
          <Alert color="red" variant="light" size="xs">
            <Text size="xs">
              <strong>Safety item:</strong> This recommendation cannot be hidden or deferred. It requires clinical review before this session.
            </Text>
          </Alert>
        )}

        {/* Current status badge */}
        {currentStatus !== 'pending' && (
          <Group>
            <Badge
              color={currentStatus === 'complete' ? 'green' : currentStatus === 'deferred' ? 'orange' : 'gray'}
              variant="light"
              size="sm"
            >
              {currentStatus === 'complete' ? '✓ Complete' : currentStatus === 'deferred' ? '⏱ Deferred' : '◌ Hidden'}
            </Badge>
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              onClick={() => onStatusChange?.(rec, 'pending')}
            >
              Reopen
            </Button>
          </Group>
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
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('workflow.node.evidence')}</Text>
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

        {/* Content-generating actions */}
        {contentActions.length > 0 && (
          <>
            <Divider />
            <Stack gap={6}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">Generate</Text>
              <Group gap="xs">
                {contentActions.map((action) => (
                  <Button
                    key={action}
                    size="xs"
                    variant="light"
                    color={isSpiritual && ['suggest_verses', 'create_prayer_prompt'].includes(action) ? 'grape' : 'blue'}
                    onClick={() => handleContentAction(action)}
                    disabled={actionRunning}
                  >
                    {t(`workflow.action.${action}`) || action}
                  </Button>
                ))}
                {(rec.actions ?? []).includes('add_reminder_task') && (
                  <Button
                    size="xs"
                    variant="light"
                    color="teal"
                    onClick={handleAddReminder}
                    disabled={actionRunning}
                  >
                    {t('workflow.action.addReminder') || 'Add Reminder'}
                  </Button>
                )}
              </Group>
            </Stack>
          </>
        )}

        {/* Action output */}
        {actionRunning && (
          <Group justify="center" py="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Generating…</Text>
          </Group>
        )}

        {actionOutput && (
          <Stack gap={6}>
            <Group justify="space-between" align="center">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">Generated draft</Text>
              <Group gap={4}>
                <CopyButton value={actionOutput}>
                  {({ copied, copy }) => (
                    <Button size="compact-xs" variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </Button>
                  )}
                </CopyButton>
                <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setActionOutput(null)}>
                  Clear
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
              <Text size="xs">{AI_DISCLAIMER}</Text>
            </Alert>
          </Stack>
        )}

        {/* Status actions — mark complete / defer / hide */}
        <Divider />
        <Stack gap={6}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">Status</Text>

          {currentStatus !== 'complete' && (
            <Button size="xs" variant="filled" color="green" onClick={handleMarkComplete}>
              ✓ Mark Complete
            </Button>
          )}

          {!isSafetyLocked && currentStatus !== 'deferred' && (
            <>
              {showDeferInput ? (
                <Group gap="xs" align="flex-end">
                  <TextInput
                    label="Defer until"
                    type="date"
                    size="xs"
                    value={deferDate}
                    onChange={(e) => setDeferDate(e.currentTarget.value)}
                    style={{ flex: 1 }}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                  <Button size="xs" variant="light" color="orange" onClick={handleDefer} disabled={!deferDate}>
                    Confirm
                  </Button>
                  <Button size="xs" variant="subtle" color="gray" onClick={() => { setShowDeferInput(false); setDeferDate(''); }}>
                    Cancel
                  </Button>
                </Group>
              ) : (
                <Button size="xs" variant="light" color="orange" onClick={handleDefer}>
                  ⏱ Defer
                </Button>
              )}
            </>
          )}

          {!isSafetyLocked && currentStatus !== 'hidden' && (
            <Button size="xs" variant="subtle" color="gray" onClick={handleHide}>
              ◌ Hide (auto-expires in 30 days)
            </Button>
          )}
        </Stack>
      </Stack>
    </Drawer>
  );
}
