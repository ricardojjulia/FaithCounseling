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
import LicensureProgressBars from './TimeTracking/LicensureProgressBars.jsx';

function resolveClientFullName(client) {
  return [client?.firstName, client?.lastName]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .trim();
}

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

function SummaryCard({ label, value, help }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>{label}</Text>
      <Text fw={700} fz="xl" mt={6}>{value}</Text>
      {help ? <Text c="dimmed" fz="sm" mt={4}>{help}</Text> : null}
    </Paper>
  );
}

function ActionButton({ action, onClick, children }) {
  return (
    <Button
      variant="default"
      onClick={() => {
        frontendTelemetry.trackAction('counselor_home', action, 'success', {
          workflow: 'counselor_home',
        });
        onClick?.();
      }}
    >
      {children}
    </Button>
  );
}

export default function CounselorHomePage({
  currentUser,
  metricsData,
  workspaceData,
  onOpenScheduling,
  onOpenClient,
  onOpenClients,
  onOpenClinicalChart,
  onOpenDocuments,
}) {
  const { t } = useI18n();
  const noteGapClients = workspaceData?.noteGapCounts ?? { over1Day: 0, over3Days: 0, over7Days: 0 };
  const outstandingAssignments = workspaceData?.assignmentCounts ?? { total: 0, documents: 0, forms: 0 };
  const noteGapItems = workspaceData?.noteGapItems ?? [];
  const unscheduledClients = workspaceData?.unscheduledClients ?? [];
  const highTouchpointClients = workspaceData?.highTouchpointClients ?? [];
  const intakePreviewItems = workspaceData?.intakePreviewItems ?? [];
  const noteGapChartTarget = noteGapItems[0]?.clientId
    ? {
        clientId: noteGapItems[0].clientId,
        initialTab: 'sessionNotes',
        initialSessionNotesComposerOpen: true,
        initialSessionNotesAppointmentAt: noteGapItems[0].latestAppointmentAt ?? '',
      }
    : null;
  const topFollowUpClients = unscheduledClients.length > 0
    ? unscheduledClients.slice(0, 4)
    : highTouchpointClients.slice(0, 4).map((client) => ({
        clientId: client.id,
        clientName: resolveClientFullName(client) || t('clientsPage.unnamedClient'),
        status: client.status ?? 'active',
        highTouchpoint: true,
      }));
  const firstName = typeof currentUser?.name === 'string'
    ? currentUser.name.trim().split(/\s+/)[0] ?? ''
    : '';
  const priorities = [
    noteGapClients.over7Days > 0 ? {
      title: t('counselorHome.priority.urgentNotesTitle'),
      detail: t('counselorHome.priority.urgentNotesDetail', { count: noteGapClients.over7Days }),
      severity: 'critical',
    } : null,
    noteGapClients.over3Days > 0 ? {
      title: t('counselorHome.priority.noteReviewTitle'),
      detail: t('counselorHome.priority.noteReviewDetail', { count: noteGapClients.over3Days }),
      severity: 'warning',
    } : null,
    outstandingAssignments.total > 0 ? {
      title: t('counselorHome.priority.assignedWorkTitle'),
      detail: t('counselorHome.priority.assignedWorkDetail', { count: outstandingAssignments.total }),
      severity: 'warning',
    } : null,
    unscheduledClients.length > 0 ? {
      title: t('counselorHome.priority.followUpTitle'),
      detail: t('counselorHome.priority.followUpDetail', { count: unscheduledClients.length }),
      severity: 'warning',
    } : null,
    intakePreviewItems.length > 0 ? {
      title: t('counselorHome.priority.intakePreviewTitle'),
      detail: t('counselorHome.priority.intakePreviewDetail', { count: intakePreviewItems.length }),
      severity: 'warning',
    } : null,
  ].filter(Boolean);

  return (
    <Stack gap="lg" p="xl" style={{ minHeight: 0, flex: 1 }}>
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={2}>{t('counselorHome.title')}</Title>
          <Text c="dimmed" mt={4}>
            {firstName
              ? t('counselorHome.subtitleNamed', { name: firstName })
              : t('counselorHome.subtitle')}
          </Text>
        </div>
        <Group gap="sm">
          <ActionButton action="open_schedule" onClick={() => onOpenScheduling?.()}>
            {t('counselorHome.actions.schedule')}
          </ActionButton>
          <ActionButton action="open_clients" onClick={() => onOpenClients?.()}>
            {t('counselorHome.actions.clients')}
          </ActionButton>
          <ActionButton action="open_chart" onClick={() => onOpenClinicalChart?.(noteGapChartTarget)}>
            {t('counselorHome.actions.chart')}
          </ActionButton>
          <ActionButton action="open_documents" onClick={() => onOpenDocuments?.()}>
            {t('counselorHome.actions.documents')}
          </ActionButton>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
        <SummaryCard
          label={t('counselorHome.cards.today')}
          value={metricsData?.sessions ?? 0}
          help={t('counselorHome.cards.todayHelp')}
        />
        <SummaryCard
          label={t('counselorHome.cards.upcoming')}
          value={metricsData?.futureAppointments ?? 0}
          help={t('counselorHome.cards.upcomingHelp')}
        />
        <SummaryCard
          label={t('counselorHome.cards.notes')}
          value={noteGapClients.over1Day ?? 0}
          help={t('counselorHome.cards.notesHelp')}
        />
        <SummaryCard
          label={t('counselorHome.cards.assignments')}
          value={outstandingAssignments.total ?? 0}
          help={t('counselorHome.cards.assignmentsHelp', {
            documents: outstandingAssignments.documents ?? 0,
            forms: outstandingAssignments.forms ?? 0,
          })}
        />
        <SummaryCard
          label={t('counselorHome.cards.intakePreviews')}
          value={intakePreviewItems.length}
          help={t('counselorHome.cards.intakePreviewsHelp')}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2, xl: 4 }} spacing="md">
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <div>
              <Title order={3} fz="md">{t('counselorHome.priorities.title')}</Title>
              <Text c="dimmed" fz="sm" mt={4}>{t('counselorHome.priorities.subtitle')}</Text>
            </div>

            {priorities.length === 0 ? (
              <Text c="dimmed" fz="sm">{t('counselorHome.priorities.empty')}</Text>
            ) : priorities.slice(0, 4).map((item, index) => (
              <Paper key={`${item.title}-${index}`} withBorder radius="sm" p="sm">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Text fw={600} fz="sm">{item.title}</Text>
                    {item.detail ? <Text c="dimmed" fz="sm">{item.detail}</Text> : null}
                  </Stack>
                  <Badge color={item.severity === 'critical' ? 'red' : 'orange'} variant="light">
                    {item.severity === 'critical'
                      ? t('dashboard.alerts.severity.critical')
                      : t('dashboard.alerts.severity.warning')}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <div>
              <Title order={3} fz="md">{t('counselorHome.intakePreviews.title')}</Title>
              <Text c="dimmed" fz="sm" mt={4}>{t('counselorHome.intakePreviews.subtitle')}</Text>
            </div>

            {intakePreviewItems.length === 0 ? (
              <Text c="dimmed" fz="sm">{t('counselorHome.intakePreviews.empty')}</Text>
            ) : intakePreviewItems.slice(0, 4).map((item) => (
              <Paper key={item.clientId} withBorder radius="sm" p="sm">
                <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Text fw={600} fz="sm">{item.clientName || t('clientsPage.unnamedClient')}</Text>
                    <Group gap="xs">
                      <Badge color={statusTone(item.status)} variant="light">
                        {formatStatusLabel(item.status, t)}
                      </Badge>
                      <Badge color="yellow" variant="light">
                        {t('dashboard.alerts.severity.warning')}
                      </Badge>
                    </Group>
                    <Text c="dimmed" fz="sm">
                      {t('counselorHome.intakePreviews.itemDetail', {
                        screenings: item.screeningSignalCount ?? 0,
                        routes: item.careRouteCount ?? 0,
                      })}
                    </Text>
                  </Stack>
                  <Button
                    size="compact-sm"
                    variant="subtle"
                    onClick={() => {
                      frontendTelemetry.trackAction('counselor_home', 'open_intake_preview', 'success', {
                        workflow: 'counselor_home',
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
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <div>
              <Title order={3} fz="md">{t('counselorHome.followUp.title')}</Title>
              <Text c="dimmed" fz="sm" mt={4}>{t('counselorHome.followUp.subtitle')}</Text>
            </div>

            {topFollowUpClients.length === 0 ? (
              <Text c="dimmed" fz="sm">{t('counselorHome.followUp.empty')}</Text>
            ) : topFollowUpClients.map((client) => (
              <Paper key={client.clientId ?? client.clientName} withBorder radius="sm" p="sm">
                <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Text fw={600} fz="sm">{client.clientName || t('clientsPage.unnamedClient')}</Text>
                    <Group gap="xs">
                      <Badge color={statusTone(client.status)} variant="light">
                        {formatStatusLabel(client.status, t)}
                      </Badge>
                      {client.highTouchpoint ? (
                        <Badge color="grape" variant="light">
                          {t('clientsPage.highTouchpointBadge')}
                        </Badge>
                      ) : null}
                    </Group>
                  </Stack>
                  {client.clientId ? (
                    <Button
                      size="compact-sm"
                      variant="subtle"
                      onClick={() => {
                        frontendTelemetry.trackAction('counselor_home', 'schedule_follow_up_client', 'success', {
                          workflow: 'counselor_home',
                        });
                        onOpenScheduling?.(client.clientId);
                      }}
                    >
                      {t('dashboard.drilldown.scheduleClient')}
                    </Button>
                  ) : null}
                </Group>
              </Paper>
            ))}

            <Button
              variant="light"
              onClick={() => {
                frontendTelemetry.trackAction('counselor_home', 'review_clients', 'success', {
                  workflow: 'counselor_home',
                });
                onOpenClients?.();
              }}
            >
              {t('counselorHome.followUp.reviewAll')}
            </Button>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <div>
              <Title order={3} fz="md">{t('counselorHome.documentation.title')}</Title>
              <Text c="dimmed" fz="sm" mt={4}>{t('counselorHome.documentation.subtitle')}</Text>
            </div>

            <Paper withBorder radius="sm" p="sm">
              <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>{t('dashboard.compliance.oneDay')}</Text>
              <Text fw={700} fz="xl" mt={6}>{noteGapClients.over1Day ?? 0}</Text>
              <Text c="dimmed" fz="sm" mt={4}>{t('counselorHome.documentation.notesHelp')}</Text>
            </Paper>

            <Paper withBorder radius="sm" p="sm">
              <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>{t('dashboard.compliance.outstandingAssignedWork')}</Text>
              <Text fw={700} fz="xl" mt={6}>{outstandingAssignments.total ?? 0}</Text>
              <Text c="dimmed" fz="sm" mt={4}>
                {t('counselorHome.cards.assignmentsHelp', {
                  documents: outstandingAssignments.documents ?? 0,
                  forms: outstandingAssignments.forms ?? 0,
                })}
              </Text>
            </Paper>

            <Group grow>
              <Button
                variant="default"
                onClick={() => {
                  frontendTelemetry.trackAction('counselor_home', 'open_charting', 'success', {
                    workflow: 'counselor_home',
                  });
                  onOpenClinicalChart?.(noteGapChartTarget);
                }}
              >
                {t('counselorHome.documentation.chartAction')}
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  frontendTelemetry.trackAction('counselor_home', 'open_documents', 'success', {
                    workflow: 'counselor_home',
                  });
                  onOpenDocuments?.();
                }}
              >
                {t('counselorHome.documentation.documentsAction')}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </SimpleGrid>

      <LicensureProgressBars userId={currentUser?.id} />
    </Stack>
  );
}
