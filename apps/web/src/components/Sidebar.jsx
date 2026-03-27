import { NavLink, Stack, Text, Group, Button, Box, Divider } from '@mantine/core';

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'Dashboard' },
  { key: 'users',       label: 'User Maintenance' },
  { key: 'counselors',  label: 'Counselors' },
  { key: 'clients',     label: 'Clients' },
  { key: 'scheduling',  label: 'Scheduling' },
  { key: 'clinical',    label: 'Clinical Chart' },
  { key: 'documents',   label: 'Documents' },
  { key: 'billing',     label: 'Billing' },
  { key: 'portal',            label: 'Portal' },
  { key: 'workspace-studio', label: 'Workspace Studio' },
  { key: 'operations',       label: 'Operations Studio', href: '/operations.html' },
  { key: 'faith',       label: 'Faith Workflows' },
  { key: 'about',       label: 'About', href: '/about.html' },
  { key: 'monitor',     label: 'Monitoring', href: '/monitor.html' },
];

function canViewNavItem(item, role) {
  if (item.key === 'users' || item.key === 'counselors') {
    return ['platform_admin', 'practice_owner', 'practice_admin'].includes(role || '');
  }
  return true;
}

function resolveUserLabel(user, role) {
  if (typeof user?.name === 'string' && user.name.trim()) {
    return role ? `${user.name.trim()} • ${role}` : user.name.trim();
  }
  if (typeof user?.email === 'string' && user.email.trim()) {
    return role ? `${user.email.trim()} • ${role}` : user.email.trim();
  }
  return role ? `Signed in as ${role}` : 'Not signed in';
}

export default function Sidebar({ currentUser, currentView, onNavigate, onOpenClientPicker, onSignOut }) {
  const userRole = currentUser?.role ?? null;
  const visibleNavItems = NAV_ITEMS.filter((item) => canViewNavItem(item, userRole));

  return (
    <Stack h="100%" justify="space-between" gap={0} p="sm">
      <Box>
        <Group gap="sm" mb="md" px="xs">
          <Box
            w={38} h={38}
            style={{
              borderRadius: 10,
              background: 'linear-gradient(150deg, #6366f1, #8b5cf6)',
              flexShrink: 0,
            }}
          />
          <Box>
            <Text fw={700} fz="sm" lh={1.2}>Faith Counseling</Text>
            <Text fz="xs" c="dimmed" lh={1.2}>Practice Workspace</Text>
          </Box>
        </Group>

        <Text
          fz="xs"
          c="dimmed"
          px="xs"
          mb="sm"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 999,
            padding: '6px 12px',
            display: 'inline-block',
          }}
        >
          {resolveUserLabel(currentUser, userRole)}
        </Text>

        <Stack gap={2} component="nav" aria-label="Primary">
          {visibleNavItems.map((item) =>
            item.href ? (
              <NavLink
                key={item.key}
                component="a"
                href={item.href}
                label={item.label}
                styles={{ root: { borderRadius: 8 } }}
              />
            ) : (
              <NavLink
                key={item.key}
                label={item.label}
                active={currentView === item.key}
                onClick={() => onNavigate?.(item.key)}
                styles={{ root: { borderRadius: 8 } }}
              />
            )
          )}
        </Stack>
      </Box>

      <Box>
        <Divider mb="sm" />
        <Button variant="default" fullWidth onClick={onSignOut}>
          Sign out
        </Button>
      </Box>
    </Stack>
  );
}
