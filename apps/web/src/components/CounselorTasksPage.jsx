import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { frontendTelemetry } from '../lib/frontendTelemetry.js';
import { useI18n } from '../lib/i18nContext.jsx';

function statusTone(status) {
  switch (status) {
    case 'active':
      return 'green';
    case 'waitlist':
      return 'yellow';
    case 'inactive':
      return 'gray';
    case 'discharged':
      return 'blue';
    default:
      return 'gray';
  }
}

function formatStatusLabel(status, t) {
  if (!status) return t('clientsPage.none');
  const translated = t(`status.${status}`);
  return translated === `status.${status}` ? status : translated;
}

function SectionCard({ title, subtitle, empty, children }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <div>
          <Title order={3} fz="md">{title}</Title>
          {subtitle ? <Text c="dimmed" fz="sm" mt={4}>{subtitle}</Text> : null}
        </div>
        {children ?? <Text c="dimmed" fz="sm">{empty}</Text>}
      </Stack>
    </Paper>
  );
}

function SummaryCard({ label, value, help }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>{label}</Text>
      <Text fw={700} fz="xl" mt={6}>{value}</Text>
      {help ? <Text c="dimmed" fz="sm" mt={4}>{help}</Text> : null}
    </Paper>
  );
}

export default function CounselorTasksPage({
  workspaceData,
  onOpenClient,
  onOpenChart,
  onOpenDocuments,
  onOpenScheduling,
}) {
  const { t } = useI18n();
  const noteGapItems = workspaceData?.noteGapItems ?? [];
  const assignmentItems = workspaceData?.assignmentItems ?? [];
  const unscheduledClients = workspaceData?.unscheduledClients ?? [];
  const intakePreviewItems = workspaceData?.intakePreviewItems ?? [];
  const noteGapCounts = workspaceData?.noteGapCounts ?? { over1Day: 0, over3Days: 0, over7Days: 0 };
  const assignmentCounts = workspaceData?.assignmentCounts ?? { total: 0, documents: 0, forms: 0 };

  return (
    <Stack gap="lg" p="xl" style={{ minHeight: 0, flex: 1 }}>
      <div>
        <Title order={2}>{t('tasks.title')}</Title>
        <Text c="dimmed" mt={4}>{t('tasks.subtitle')}</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
        <SummaryCard
          label={t('tasks.cards.notes')}
          value={noteGapCounts.over1Day}
          help={t('tasks.cards.notesHelp')}
        />
        <SummaryCard
          label={t('tasks.cards.urgentNotes')}
          value={noteGapCounts.over7Days}
          help={t('tasks.cards.urgentNotesHelp')}
        />
        <SummaryCard
          label={t('tasks.cards.assignments')}
          value={assignmentCounts.total}
          help={t('tasks.cards.assignmentsHelp', {
            documents: assignmentCounts.documents,
            forms: assignmentCounts.forms,
          })}
        />
        <SummaryCard
          label={t('tasks.cards.followUp')}
          value={unscheduledClients.length}
          help={t('tasks.cards.followUpHelp')}
        />
        <SummaryCard
          label={t('tasks.cards.intakePreviews')}
          value={intakePreviewItems.length}
          help={t('tasks.cards.intakePreviewsHelp')}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2, xl: 4 }} spacing="md">
        <SectionCard
          title={t('tasks.notes.title')}
          subtitle={t('tasks.notes.subtitle')}
          empty={t('tasks.notes.empty')}
        >
          {noteGapItems.length === 0 ? (
            <Text c="dimmed" fz="sm">{t('tasks.notes.empty')}</Text>
          ) : (
            <Stack gap="sm">
              {noteGapItems
                .slice()
                .sort((left, right) => Number(right.daysWithoutNote ?? 0) - Number(left.daysWithoutNote ?? 0))
                .map((item) => (
                  <Paper key={`${item.clientId}-${item.latestAppointmentAt}`} withBorder radius="sm" p="sm">
                    <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={600} fz="sm">{item.clientName}</Text>
                        <Text c="dimmed" fz="sm">
                          {t('tasks.notes.daysWithoutNote', { days: item.daysWithoutNote })}
                        </Text>
                      </Stack>
                      <Button
                        size="compact-sm"
                        variant="subtle"
                        onClick={() => {
                          frontendTelemetry.trackAction('tasks', 'open_chart_note_gap', 'success', {
                            workflow: 'counselor_tasks',
                          });
                          onOpenChart?.({
                            clientId: item.clientId,
                            initialTab: 'sessionNotes',
                            initialSessionNotesComposerOpen: true,
                            initialSessionNotesAppointmentAt: item.latestAppointmentAt ?? '',
                          });
                        }}
                      >
                        {t('tasks.notes.reviewAction')}
                      </Button>
                    </Group>
                  </Paper>
                ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title={t('tasks.assignments.title')}
          subtitle={t('tasks.assignments.subtitle')}
          empty={t('tasks.assignments.empty')}
        >
          {assignmentItems.length === 0 ? (
            <Text c="dimmed" fz="sm">{t('tasks.assignments.empty')}</Text>
          ) : (
            <Stack gap="sm">
              {assignmentItems.map((item) => (
                <Paper key={`${item.kind}-${item.id}`} withBorder radius="sm" p="sm">
                  <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Text fw={600} fz="sm">{item.clientName}</Text>
                      <Text c="dimmed" fz="sm">{item.title}</Text>
                      <Badge variant="light" color={item.kind === 'document' ? 'blue' : 'grape'}>
                        {item.kind === 'document' ? t('dashboard.compliance.documents') : t('dashboard.compliance.forms')}
                      </Badge>
                    </Stack>
                    <Button
                      size="compact-sm"
                      variant="subtle"
                      onClick={() => {
                        frontendTelemetry.trackAction('tasks', 'open_documents', 'success', {
                          workflow: 'counselor_tasks',
                        });
                        onOpenDocuments?.();
                      }}
                    >
                      {t('tasks.assignments.reviewAction')}
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title={t('tasks.followUp.title')}
          subtitle={t('tasks.followUp.subtitle')}
          empty={t('tasks.followUp.empty')}
        >
          {unscheduledClients.length === 0 ? (
            <Text c="dimmed" fz="sm">{t('tasks.followUp.empty')}</Text>
          ) : (
            <Stack gap="sm">
              {unscheduledClients.map((item) => (
                <Paper key={item.clientId} withBorder radius="sm" p="sm">
                  <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Text fw={600} fz="sm">{item.clientName}</Text>
                      <Group gap="xs">
                        <Badge color={statusTone(item.status)} variant="light">
                          {formatStatusLabel(item.status, t)}
                        </Badge>
                        {item.highTouchpoint ? (
                          <Badge color="grape" variant="light">
                            {t('clientsPage.highTouchpointBadge')}
                          </Badge>
                        ) : null}
                      </Group>
                    </Stack>
                    <Button
                      size="compact-sm"
                      variant="subtle"
                      onClick={() => {
                        frontendTelemetry.trackAction('tasks', 'open_scheduling', 'success', {
                          workflow: 'counselor_tasks',
                        });
                        onOpenScheduling?.(item.clientId);
                      }}
                    >
                      {t('dashboard.drilldown.scheduleClient')}
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title={t('tasks.intakePreviews.title')}
          subtitle={t('tasks.intakePreviews.subtitle')}
          empty={t('tasks.intakePreviews.empty')}
        >
          {intakePreviewItems.length === 0 ? (
            <Text c="dimmed" fz="sm">{t('tasks.intakePreviews.empty')}</Text>
          ) : (
            <Stack gap="sm">
              {intakePreviewItems.map((item) => (
                <Paper key={item.clientId} withBorder radius="sm" p="sm">
                  <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Text fw={600} fz="sm">{item.clientName}</Text>
                      <Text c="dimmed" fz="sm">
                        {t('tasks.intakePreviews.itemDetail', {
                          screenings: item.screeningSignalCount ?? 0,
                          routes: item.careRouteCount ?? 0,
                        })}
                      </Text>
                      <Badge color={statusTone(item.status)} variant="light">
                        {formatStatusLabel(item.status, t)}
                      </Badge>
                    </Stack>
                    <Button
                      size="compact-sm"
                      variant="subtle"
                      onClick={() => {
                        frontendTelemetry.trackAction('tasks', 'open_intake_preview', 'success', {
                          workflow: 'counselor_tasks',
                        });
                        onOpenClient?.({ clientId: item.clientId, initialTab: 'intakePreview' });
                      }}
                    >
                      {t('dashboard.drilldown.openPreview')}
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </SectionCard>
      </SimpleGrid>
    </Stack>
  );
}
