import { Group, Button, Title, Badge, Text, Box, Paper } from '@mantine/core';

const STATUS_COLOR = { active: 'green', inactive: 'gray', waitlist: 'yellow', discharged: 'blue' };

function calculateAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age -= 1;
  return age;
}

function formatDate(ds) {
  if (!ds) return null;
  const d = new Date(ds);
  return isNaN(d.getTime()) ? ds : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ClientDetailHeader({ client, onBack, onScheduleClient }) {
  const displayName = client.preferredName
    ? `${client.preferredName} (${client.firstName} ${client.lastName})`
    : `${client.firstName}${client.middleName ? ' ' + client.middleName : ''} ${client.lastName}`;

  const age = calculateAge(client.dateOfBirth);
  const dob = formatDate(client.dateOfBirth);

  return (
    <Paper radius={0} withBorder style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }} p="md">
      <Group gap="md" wrap="wrap">
        <Button variant="default" size="sm" onClick={onBack}>← Clients</Button>
        <Button size="sm" onClick={onScheduleClient}>Schedule Appointment</Button>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" wrap="wrap" align="center">
            <Title order={1} fz="xl" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </Title>
            <Badge color={STATUS_COLOR[client.status] || 'gray'} variant="light" tt="capitalize">
              {client.status}
            </Badge>
          </Group>
          <Group gap="lg" mt={4}>
            {dob && <Text fz="sm" c="dimmed">DOB: {dob}{age !== null && ` (${age} yrs)`}</Text>}
            <Text fz="sm" c="dimmed">ID: {client.id}</Text>
            {client.pronouns && <Text fz="sm" c="dimmed">Pronouns: {client.pronouns}</Text>}
          </Group>
        </Box>
      </Group>
    </Paper>
  );
}
