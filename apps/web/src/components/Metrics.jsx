import { SimpleGrid, Paper, Text, Badge } from '@mantine/core';

const META_COLOR = { positive: 'green', warning: 'orange', '': 'gray' };

export default function Metrics({ data }) {
  const metrics = [
    { label: "Today's Sessions", value: data.sessions || 0, meta: data.sessionsMeta || 'Scheduled for today', tone: 'positive' },
    { label: 'Future Appointments', value: data.futureAppointments || 0, meta: data.futureAppointmentsMeta || 'Scheduled ahead', tone: '' },
    { label: 'Audit Events', value: data.auditEvents || 0, meta: data.auditEventsMeta || 'Last 7 days', tone: '' },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" p="md" component="section" aria-label="Key metrics">
      {metrics.map((m, i) => (
        <Paper key={i} p="md" radius="lg" withBorder shadow="xs">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" ls={0.5}>{m.label}</Text>
          <Text fz="2rem" fw={700} my={4}>{m.value}</Text>
          <Badge color={META_COLOR[m.tone]} variant="light" size="sm">{m.meta}</Badge>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
