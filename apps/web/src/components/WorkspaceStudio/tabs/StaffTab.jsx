import { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button, Alert, Loader, Badge,
  Divider, SimpleGrid, Avatar,
} from '@mantine/core';

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

const ROLE_COLOR = {
  practice_admin: 'violet',
  counselor: 'blue',
  supervisor: 'teal',
  intern: 'orange',
};

const LICENSE_LABELS = {
  lmft: 'LMFT',
  lpc: 'LPC',
  lcsw: 'LCSW',
  psychologist: 'Psychologist',
  pastoral_counselor: 'Pastoral Counselor',
};

function initials(first, last) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

export default function StaffTab({ onOpenCounselorMaintenance }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/v1/staff')
      .then((payload) => setStaff(Array.isArray(payload?.items) ? payload.items : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const counselors = staff.filter((s) => s.role === 'counselor' || s.role === 'supervisor' || s.role === 'intern');
  const admins = staff.filter((s) => s.role === 'practice_admin');

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load staff">{error}</Alert>;

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" align="flex-start" mb="md">
          <Stack gap={2}>
            <Title order={3} fz="md">Staff Roster</Title>
            <Text fz="sm" c="dimmed">
              {staff.length} staff member{staff.length !== 1 ? 's' : ''} — {counselors.length} counselor{counselors.length !== 1 ? 's' : ''}, {admins.length} admin{admins.length !== 1 ? 's' : ''}
            </Text>
          </Stack>
          {onOpenCounselorMaintenance && (
            <Button size="xs" variant="light" onClick={onOpenCounselorMaintenance}>
              Manage Staff Accounts →
            </Button>
          )}
        </Group>
        <Divider mb="md" />

        {!staff.length ? (
          <Text c="dimmed" fz="sm">No staff members found.</Text>
        ) : (
          <Stack gap="lg">
            {counselors.length > 0 && (
              <Stack gap="xs">
                <Text fz="xs" fw={700} tt="uppercase" c="dimmed">Counselors</Text>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                  {counselors.map((member) => (
                    <Paper key={member.id} withBorder radius="sm" p="sm">
                      <Group gap="sm" wrap="nowrap">
                        <Avatar color={ROLE_COLOR[member.role] ?? 'gray'} radius="xl" size="md">
                          {initials(member.firstName, member.lastName)}
                        </Avatar>
                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Text fz="sm" fw={600} truncate>{member.firstName} {member.lastName}</Text>
                            <Badge size="xs" color={ROLE_COLOR[member.role] ?? 'gray'} variant="light">
                              {member.role?.replaceAll('_', ' ')}
                            </Badge>
                          </Group>
                          <Text fz="xs" c="dimmed">{member.email}</Text>
                          <Group gap="xs" mt={2}>
                            {member.licenseType && (
                              <Badge size="xs" variant="outline" color="gray">
                                {LICENSE_LABELS[member.licenseType] ?? member.licenseType.toUpperCase()}
                              </Badge>
                            )}
                            {member.licenseNumber && (
                              <Text fz="xs" c="dimmed"># {member.licenseNumber}</Text>
                            )}
                          </Group>
                          {member.supervisionStatus && member.supervisionStatus !== 'not_required' && (
                            <Badge size="xs" color="orange" variant="dot">
                              Supervision: {member.supervisionStatus.replaceAll('_', ' ')}
                            </Badge>
                          )}
                          {member.bio && (
                            <Text fz="xs" c="dimmed" mt={2} lineClamp={2}>{member.bio}</Text>
                          )}
                        </Stack>
                      </Group>
                    </Paper>
                  ))}
                </SimpleGrid>
              </Stack>
            )}

            {admins.length > 0 && (
              <Stack gap="xs">
                <Text fz="xs" fw={700} tt="uppercase" c="dimmed">Administrators</Text>
                {admins.map((member) => (
                  <Paper key={member.id} withBorder radius="sm" p="sm">
                    <Group gap="sm" wrap="nowrap">
                      <Avatar color="violet" radius="xl" size="md">
                        {initials(member.firstName, member.lastName)}
                      </Avatar>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <Text fz="sm" fw={600}>{member.firstName} {member.lastName}</Text>
                          <Badge size="xs" color="violet" variant="light">Practice Admin</Badge>
                          {member.accountLocked && <Badge size="xs" color="red" variant="light">Locked</Badge>}
                        </Group>
                        <Text fz="xs" c="dimmed">{member.email}</Text>
                        {member.lastLoginAt && (
                          <Text fz="xs" c="dimmed">
                            Last login: {new Date(member.lastLoginAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Paper>

      <Paper withBorder radius="md" p="md" bg="gray.0">
        <Group gap="sm">
          <Text fz="sm">To add staff, edit accounts, reset passwords, or manage roles, use the full</Text>
          {onOpenCounselorMaintenance ? (
            <Button size="xs" variant="light" onClick={onOpenCounselorMaintenance}>Staff Management page →</Button>
          ) : (
            <Text fz="sm" fw={600}>Staff Management page</Text>
          )}
        </Group>
      </Paper>
    </Stack>
  );
}
