import { SimpleGrid, Paper, Text, Badge } from '@mantine/core';

const META_COLOR = { positive: 'green', warning: 'orange', '': 'gray' };

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function formatRoleLabel(role) {
  if (typeof role !== 'string' || !role.trim()) return null;
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Metrics({ data, currentUser }) {
  const sessionLabel = firstString(currentUser?.name, currentUser?.email) ?? 'Secure session';
  const sessionMeta = [
    formatRoleLabel(currentUser?.role),
    'Server-managed session',
  ].filter(Boolean).join(' · ');

  const metrics = [
    { label: "Today's Sessions", value: data.sessions || 0, meta: data.sessionsMeta || 'Scheduled for today', tone: 'positive' },
    { label: 'Future Appointments', value: data.futureAppointments || 0, meta: data.futureAppointmentsMeta || 'Scheduled ahead', tone: '' },
    { label: 'Audit Events', value: data.auditEvents || 0, meta: data.auditEventsMeta || 'Last 7 days', tone: '' },
    { label: 'Current Session', value: sessionLabel, meta: sessionMeta || 'Server-managed session', tone: '' },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm" p="md" component="section" aria-label="Key metrics">
      {metrics.map((m, i) => (
        <Paper key={i} p="md" radius="lg" withBorder shadow="xs" className={typeof m.value === 'string' ? 'metric-card metric-card--session' : 'metric-card'}>
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" ls={0.5}>{m.label}</Text>
          <Text className={typeof m.value === 'string' ? 'metric-card__value metric-card__value--session' : 'metric-card__value'} fw={700} my={4}>
            {m.value}
          </Text>
          <Badge color={META_COLOR[m.tone]} variant="light" size="sm">{m.meta}</Badge>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
