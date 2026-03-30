import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useI18n } from '../lib/i18nContext.jsx';
import ClientModal from './ClientModal';

function formatHours(minutes) {
  const safeMinutes = Number(minutes) || 0;
  const hours = safeMinutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
}

function formatStatusSummary(entries = {}, t) {
  const pairs = Object.entries(entries);
  if (!pairs.length) return t('dashboard.clients.none');
  return pairs
    .map(([status, count]) => `${formatStatusLabel(status, t)}: ${count}`)
    .join(' · ');
}

function formatStatusLabel(status, t) {
  if (!status) return t('dashboard.clients.none');
  const translation = t(`dashboard.status.${status}`);
  return translation === `dashboard.status.${status}` ? String(status) : translation;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function SummaryMetric({ label, value, help, onClick, actionLabel }) {
  const content = (
    <Paper withBorder radius="md" p="sm">
      <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>{label}</Text>
      <Text fw={700} fz="xl" mt={6}>{value}</Text>
      {help ? <Text c="dimmed" fz="xs" mt={4}>{help}</Text> : null}
      {actionLabel ? <Text c="blue" fz="xs" mt={6}>{actionLabel}</Text> : null}
    </Paper>
  );

  if (!onClick) return content;

  return (
    <UnstyledButton onClick={onClick} style={{ textAlign: 'left', width: '100%' }} aria-label={`${label}: ${value}`}>
      {content}
    </UnstyledButton>
  );
}

function DrilldownItemCard({ title, subtitle, meta, actions }) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4} style={{ flex: 1 }}>
          <Text fw={600} fz="sm">{title}</Text>
          {subtitle ? <Text c="dimmed" fz="sm">{subtitle}</Text> : null}
          {meta ? <Text c="dimmed" fz="xs">{meta}</Text> : null}
        </Stack>
        {actions ? <Group gap="xs">{actions}</Group> : null}
      </Group>
    </Paper>
  );
}

export default function WorkspaceGrid({
  operationsSummaryData,
  onClientsUpdated,
  onViewClient,
  onViewCalendar,
  onNewAppointment,
  onScheduleClient,
  onOpenDocuments,
  onOpenPortalQueue,
}) {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [drilldown, setDrilldown] = useState({ type: null, title: '', items: [] });

  const summary = operationsSummaryData?.summary ?? null;
  const loading = operationsSummaryData?.loading ?? false;
  const error = operationsSummaryData?.error ?? null;

  const todaySchedule = summary?.todaySchedule ?? {};
  const priorityQueue = summary?.priorityQueue ?? {};
  const complianceWatch = summary?.complianceWatch ?? {};
  const clientsBox = summary?.clientsBox ?? {};
  const workload = Array.isArray(todaySchedule.workload) ? todaySchedule.workload : [];
  const noteGapClients = complianceWatch?.noteGapClients ?? {};
  const outstandingAssignments = complianceWatch?.outstandingAssignments ?? {};
  const portalRequests = clientsBox?.portalRequests ?? {};

  const openDrilldown = (type, title, items = []) => {
    setDrilldown({ type, title, items: Array.isArray(items) ? items : [] });
  };

  const closeDrilldown = () => setDrilldown({ type: null, title: '', items: [] });

  const renderSummaryState = () => {
    if (loading) {
      return (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      );
    }
    if (error) {
      return <Text c="red" fz="sm">{error}</Text>;
    }
    return null;
  };

  const renderDrilldownItems = () => {
    if (!drilldown.items.length) {
      return <Text c="dimmed" fz="sm">{t('dashboard.drilldown.empty')}</Text>;
    }

    if (drilldown.type === 'highTouchpoint') {
      return (
        <Stack gap="sm">
          {drilldown.items.map((item) => (
            <DrilldownItemCard
              key={item.clientId}
              title={item.clientName}
              subtitle={`${t('dashboard.drilldown.clientStatus')}: ${formatStatusLabel(item.status, t)}`}
              actions={item.clientId ? (
                <Button size="xs" variant="light" onClick={() => {
                  closeDrilldown();
                  onViewClient?.(item.clientId);
                }}
                >
                  {t('dashboard.drilldown.openClient')}
                </Button>
              ) : null}
            />
          ))}
        </Stack>
      );
    }

    if (drilldown.type === 'noteGap') {
      return (
        <Stack gap="sm">
          {drilldown.items.map((item) => (
            <DrilldownItemCard
              key={`${item.clientId}-${item.latestAppointmentAt}`}
              title={item.clientName}
              subtitle={`${t('dashboard.drilldown.daysWithoutNote')}: ${item.daysWithoutNote}`}
              meta={[
                item.counselorName ? `${t('dashboard.drilldown.counselor')}: ${item.counselorName}` : null,
                item.latestAppointmentAt ? `${t('dashboard.drilldown.latestAppointment')}: ${formatDateTime(item.latestAppointmentAt)}` : null,
              ].filter(Boolean).join(' · ')}
              actions={item.clientId ? (
                <Button size="xs" variant="light" onClick={() => {
                  closeDrilldown();
                  onViewClient?.(item.clientId);
                }}
                >
                  {t('dashboard.drilldown.openClient')}
                </Button>
              ) : null}
            />
          ))}
        </Stack>
      );
    }

    if (drilldown.type === 'assignments') {
      return (
        <Stack gap="sm">
          {drilldown.items.map((item) => (
            <DrilldownItemCard
              key={`${item.kind}-${item.id}`}
              title={item.title}
              subtitle={`${item.clientName} · ${formatStatusLabel(item.status, t)}`}
              meta={`${t(`dashboard.drilldown.kind.${item.kind}`)} · ${t('dashboard.drilldown.assignmentBacklogHelp')}`}
              actions={(
                <>
                  {item.clientId ? (
                    <Button size="xs" variant="default" onClick={() => {
                      closeDrilldown();
                      onViewClient?.(item.clientId);
                    }}
                    >
                      {t('dashboard.drilldown.openClient')}
                    </Button>
                  ) : null}
                  <Button size="xs" variant="light" onClick={() => {
                    closeDrilldown();
                    onOpenDocuments?.();
                  }}
                  >
                    {t('dashboard.drilldown.openDocuments')}
                  </Button>
                </>
              )}
            />
          ))}
        </Stack>
      );
    }

    if (drilldown.type === 'unscheduledClients') {
      return (
        <Stack gap="sm">
          {drilldown.items.map((item) => (
            <DrilldownItemCard
              key={item.clientId}
              title={item.clientName}
              subtitle={`${t('dashboard.drilldown.clientStatus')}: ${formatStatusLabel(item.status, t)}`}
              meta={item.highTouchpoint ? t('dashboard.drilldown.highTouchpointBadge') : null}
              actions={(
                <>
                  <Button size="xs" variant="default" onClick={() => {
                    closeDrilldown();
                    onViewClient?.(item.clientId);
                  }}
                  >
                    {t('dashboard.drilldown.openClient')}
                  </Button>
                  <Button size="xs" variant="light" onClick={() => {
                    closeDrilldown();
                    onScheduleClient?.(item.clientId);
                  }}
                  >
                    {t('dashboard.drilldown.scheduleClient')}
                  </Button>
                </>
              )}
            />
          ))}
        </Stack>
      );
    }

    if (drilldown.type === 'portalRequests') {
      return (
        <Stack gap="sm">
          {drilldown.items.map((item) => (
            <DrilldownItemCard
              key={`${item.kind}-${item.id}`}
              title={item.displayName}
              subtitle={`${formatStatusLabel(item.status, t)} · ${item.requestType || t('dashboard.drilldown.portalRequest')}`}
              meta={[
                t(`dashboard.drilldown.kind.${item.kind}`),
                item.requestedAt ? formatDateTime(item.requestedAt) : null,
              ].filter(Boolean).join(' · ')}
              actions={(
                <>
                  {item.clientId ? (
                    <Button size="xs" variant="default" onClick={() => {
                      closeDrilldown();
                      onViewClient?.(item.clientId);
                    }}
                    >
                      {t('dashboard.drilldown.openClient')}
                    </Button>
                  ) : null}
                  <Button size="xs" variant="light" onClick={() => {
                    closeDrilldown();
                    onOpenPortalQueue?.();
                  }}
                  >
                    {t('dashboard.drilldown.openPortalQueue')}
                  </Button>
                </>
              )}
            />
          ))}
        </Stack>
      );
    }

    return null;
  };

  return (
    <Stack gap="md" p="md">
      <Modal
        opened={Boolean(drilldown.type)}
        onClose={closeDrilldown}
        title={drilldown.title}
        centered
        size="lg"
      >
        <ScrollArea.Autosize mah={520} offsetScrollbars>
          {renderDrilldownItems()}
        </ScrollArea.Autosize>
      </Modal>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <Title order={3} fz="md">{t('panels.schedule')}</Title>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={() => onViewCalendar?.()}>{t('buttons.viewCalendar')}</Button>
            <Button size="xs" onClick={() => onNewAppointment?.()}>{t('header.newAppointment')}</Button>
          </Group>
        </Group>

        {renderSummaryState() || (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <SummaryMetric
                label={t('dashboard.schedule.totalAppointments')}
                value={todaySchedule.totalAppointments ?? 0}
              />
              <SummaryMetric
                label={t('dashboard.schedule.counselorsWithEntries')}
                value={todaySchedule.counselorsWithEntries ?? 0}
              />
              <SummaryMetric
                label={t('dashboard.schedule.oneHourGaps')}
                value={todaySchedule.oneHourGapsTotal ?? 0}
                help={t('dashboard.schedule.oneHourGapsHelp')}
              />
            </SimpleGrid>

            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600}>{t('dashboard.schedule.workload')}</Text>
                <Badge variant="light">{workload.length}</Badge>
              </Group>

              {workload.length === 0 ? (
                <Text c="dimmed" fz="sm">{t('dashboard.schedule.noCounselorWorkload')}</Text>
              ) : workload.map((item) => (
                <Paper key={item.counselorId || item.counselorName} withBorder radius="md" p="sm">
                  <Group justify="space-between" align="flex-start" mb={8}>
                    <div>
                      <Text fw={600} fz="sm">{item.counselorName}</Text>
                      <Text c="dimmed" fz="xs">
                        {item.appointmentsCount} {t('dashboard.schedule.appointments')} · {formatHours(item.scheduledMinutes)} {t('dashboard.schedule.booked')}
                      </Text>
                    </div>
                    <Text fw={700} fz="sm">{Number(item.utilizationPct ?? 0).toFixed(1)}%</Text>
                  </Group>
                  <Progress value={Number(item.utilizationPct ?? 0)} size="lg" radius="xl" />
                  <Group justify="space-between" mt={8}>
                    <Text c="dimmed" fz="xs">
                      {t('dashboard.schedule.availableCapacity')}: {formatHours(item.availableMinutes)}
                    </Text>
                    <Text c="dimmed" fz="xs">
                      {t('dashboard.schedule.gaps')}: {item.oneHourGapCount ?? 0}
                    </Text>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}
      </Paper>

      <Group grow align="flex-start" gap="md">
        <Paper withBorder radius="md" p="md" style={{ flex: 1 }}>
          <Title order={3} fz="md" mb="sm">{t('panels.priority')}</Title>
          {renderSummaryState() || (
            <Stack gap="xs">
              <Text c="dimmed" fz="sm">{priorityQueue.description || t('dashboard.priority.description')}</Text>
              <Button
                variant="subtle"
                px={0}
                justify="flex-start"
                style={{ width: 'fit-content' }}
                aria-label={t('dashboard.drilldown.highTouchpointTitle')}
                onClick={() => openDrilldown(
                  'highTouchpoint',
                  t('dashboard.drilldown.highTouchpointTitle'),
                  priorityQueue.items,
                )}
              >
                <Text fw={700} fz="2rem">{priorityQueue.highTouchpointClients ?? 0}</Text>
              </Button>
              <Text c="dimmed" fz="xs">{t('dashboard.priority.highTouchpointHelp')}</Text>
            </Stack>
          )}
        </Paper>

        <Paper withBorder radius="md" p="md" style={{ flex: 1 }}>
          <Title order={3} fz="md" mb="sm">{t('panels.compliance')}</Title>
          {renderSummaryState() || (
            <Stack gap="sm">
              <SimpleGrid cols={2}>
                <SummaryMetric
                  label={t('dashboard.compliance.oneDay')}
                  value={noteGapClients.over1Day ?? 0}
                  onClick={() => openDrilldown(
                    'noteGap',
                    t('dashboard.drilldown.noteGapOneDayTitle'),
                    (complianceWatch.noteGapItems || []).filter((item) => Number(item.daysWithoutNote ?? 0) >= 1),
                  )}
                  actionLabel={t('dashboard.drilldown.viewDetails')}
                />
                <SummaryMetric
                  label={t('dashboard.compliance.threeDays')}
                  value={noteGapClients.over3Days ?? 0}
                  onClick={() => openDrilldown(
                    'noteGap',
                    t('dashboard.drilldown.noteGapThreeDayTitle'),
                    (complianceWatch.noteGapItems || []).filter((item) => Number(item.daysWithoutNote ?? 0) >= 3),
                  )}
                  actionLabel={t('dashboard.drilldown.viewDetails')}
                />
                <SummaryMetric
                  label={t('dashboard.compliance.oneWeek')}
                  value={noteGapClients.over7Days ?? 0}
                  onClick={() => openDrilldown(
                    'noteGap',
                    t('dashboard.drilldown.noteGapOneWeekTitle'),
                    (complianceWatch.noteGapItems || []).filter((item) => Number(item.daysWithoutNote ?? 0) >= 7),
                  )}
                  actionLabel={t('dashboard.drilldown.viewDetails')}
                />
                <SummaryMetric
                  label={t('dashboard.compliance.outstandingAssignedWork')}
                  value={outstandingAssignments.total ?? 0}
                  help={`${t('dashboard.compliance.documents')}: ${outstandingAssignments.documents ?? 0} · ${t('dashboard.compliance.forms')}: ${outstandingAssignments.forms ?? 0}`}
                  onClick={() => openDrilldown(
                    'assignments',
                    t('dashboard.drilldown.outstandingAssignmentsTitle'),
                    outstandingAssignments.items,
                  )}
                  actionLabel={t('dashboard.drilldown.viewDetails')}
                />
              </SimpleGrid>
            </Stack>
          )}
        </Paper>
      </Group>

      <Paper withBorder radius="md" p="md" component="section" aria-labelledby="clientsPanelTitle">
        <Group justify="space-between" mb="sm">
          <Title order={3} fz="md" id="clientsPanelTitle">{t('nav.clients')}</Title>
          <Button size="xs" onClick={() => setModalOpen(true)}>{t('clients.newClient')}</Button>
        </Group>

        {renderSummaryState() || (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <SummaryMetric label={t('dashboard.clients.totalClients')} value={clientsBox.totalClients ?? 0} />
              <SummaryMetric
                label={t('dashboard.clients.withoutScheduledAppointment')}
                value={clientsBox.withoutScheduledAppointment ?? 0}
                onClick={() => openDrilldown(
                  'unscheduledClients',
                  t('dashboard.drilldown.unscheduledClientsTitle'),
                  clientsBox.unscheduledClientItems,
                )}
                actionLabel={t('dashboard.drilldown.viewDetails')}
              />
              <SummaryMetric
                label={t('dashboard.clients.portalRequests')}
                value={portalRequests.total ?? 0}
                onClick={() => openDrilldown(
                  'portalRequests',
                  t('dashboard.drilldown.portalRequestsTitle'),
                  portalRequests.items,
                )}
                actionLabel={t('dashboard.drilldown.viewDetails')}
              />
            </SimpleGrid>

            <Box>
              <Text fw={600} fz="sm" mb={6}>{t('dashboard.clients.publicRegistrationRequests')}</Text>
              <Text c="dimmed" fz="sm">{formatStatusSummary(portalRequests.publicRegistrationStatuses, t)}</Text>
            </Box>

            <Box>
              <Text fw={600} fz="sm" mb={6}>{t('dashboard.clients.portalAppointmentRequests')}</Text>
              <Text c="dimmed" fz="sm">{formatStatusSummary(portalRequests.appointmentRequestStatuses, t)}</Text>
            </Box>
          </Stack>
        )}

        <ClientModal
          isOpen={modalOpen}
          initialClient={null}
          onClose={() => setModalOpen(false)}
          onSubmit={() => {
            setModalOpen(false);
            onClientsUpdated?.();
          }}
        />
      </Paper>
    </Stack>
  );
}
