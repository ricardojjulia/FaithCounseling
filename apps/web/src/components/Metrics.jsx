import { SimpleGrid, Paper, Text, Badge, Group } from '@mantine/core';
import { useI18n } from '../lib/i18nContext.jsx';

const META_COLOR = { positive: 'green', warning: 'orange', '': 'gray' };

function ClickablePaper({ onClick, children, ...props }) {
  const handleKeyDown = onClick
    ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }
    : undefined;
  return (
    <Paper
      {...props}
      style={onClick ? { cursor: 'pointer', ...props.style } : props.style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Paper>
  );
}

export default function Metrics({ data, onTodaySessions, onFutureAppointments, onFaithWorkflows }) {
  const { t } = useI18n();
  const faithfulCounts = data.faithfulCounts || { critical: 0, moderate: 0, routine: 0 };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm" p="md" component="section" aria-label="Key metrics">

      {/* Today's Sessions — clickable */}
      <ClickablePaper p="md" radius="lg" withBorder shadow="xs" className="metric-card" onClick={onTodaySessions}>
        <Text fz="xs" c="dimmed" fw={500} tt="uppercase" ls={0.5}>{t('metrics.sessions')}</Text>
        <Text className="metric-card__value" fw={700} my={4}>{data.sessions || 0}</Text>
        <Badge color={META_COLOR.positive} variant="light" size="sm">{data.sessionsMeta || t('metrics.scheduledToday')}</Badge>
      </ClickablePaper>

      {/* Future Appointments (30 days) — clickable */}
      <ClickablePaper p="md" radius="lg" withBorder shadow="xs" className="metric-card" onClick={onFutureAppointments}>
        <Text fz="xs" c="dimmed" fw={500} tt="uppercase" ls={0.5}>{t('metrics.futureAppointments')}</Text>
        <Text className="metric-card__value" fw={700} my={4}>{data.futureAppointments || 0}</Text>
        <Badge color={META_COLOR['']} variant="light" size="sm">{data.futureAppointmentsMeta || t('metrics.scheduledAhead30')}</Badge>
      </ClickablePaper>

      {/* Appointments to Date (Yearly) */}
      <Paper p="md" radius="lg" withBorder shadow="xs" className="metric-card">
        <Text fz="xs" c="dimmed" fw={500} tt="uppercase" ls={0.5}>{t('metrics.yearlyAppointments')}</Text>
        <Text className="metric-card__value" fw={700} my={4}>{data.yearlyAppointments || 0}</Text>
        <Badge color={META_COLOR['']} variant="light" size="sm">{t('metrics.yearlyMeta')}</Badge>
      </Paper>

      {/* Faithful Workflows */}
      <ClickablePaper p="md" radius="lg" withBorder shadow="xs" className="metric-card" onClick={onFaithWorkflows}>
        <Text fz="xs" c="dimmed" fw={500} tt="uppercase" ls={0.5}>{t('metrics.faithfulWorkflows')}</Text>
        <Group gap="xs" my={4} wrap="wrap">
          <Badge color="red" variant="light">{faithfulCounts.critical} {t('metrics.faithfulCritical')}</Badge>
          <Badge color="yellow" variant="light">{faithfulCounts.moderate} {t('metrics.faithfulModerate')}</Badge>
          <Badge color="blue" variant="light">{faithfulCounts.routine} {t('metrics.faithfulRoutine')}</Badge>
        </Group>
      </ClickablePaper>

    </SimpleGrid>
  );
}
