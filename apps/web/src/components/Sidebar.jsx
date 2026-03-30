import { NavLink, Stack, Text, Group, Button, Box, Divider, Badge } from '@mantine/core';
import { useI18n } from '../lib/i18nContext.jsx';

const NAV_ITEMS = [
  { key: 'dashboard', labelKey: 'nav.dashboard' },
  { key: 'users', labelKey: 'nav.users' },
  { key: 'counselors', labelKey: 'nav.counselors' },
  { key: 'clients', labelKey: 'nav.clients' },
  { key: 'scheduling', labelKey: 'nav.scheduling' },
  { key: 'clinical', labelKey: 'nav.clinical' },
  { key: 'documents', labelKey: 'nav.documents' },
  { key: 'offerings', labelKey: 'nav.offerings' },
  { key: 'portal', labelKey: 'nav.portal' },
  { key: 'workspace-studio', labelKey: 'nav.workspaceStudio' },
  { key: 'operations', labelKey: 'nav.operationsStudio', href: '/operations.html' },
  { key: 'faith', labelKey: 'nav.faithWorkflows' },
  { key: 'about', labelKey: 'nav.about', href: '/about.html' },
  { key: 'monitor', labelKey: 'nav.monitoring', href: '/monitor.html' },
];

function canViewNavItem(item, role) {
  if (role === 'client') {
    return ['portal', 'about', 'monitor'].includes(item.key);
  }
  if (item.key === 'users' || item.key === 'counselors') {
    return ['platform_admin', 'practice_owner', 'practice_admin'].includes(role || '');
  }
  return true;
}

function resolveUserLabel(user, role) {
  const normalizedRole = role ? role.replaceAll('_', ' ') : null;
  if (typeof user?.name === 'string' && user.name.trim()) {
    return normalizedRole ? `${user.name.trim()} • ${normalizedRole}` : user.name.trim();
  }
  if (typeof user?.email === 'string' && user.email.trim()) {
    return normalizedRole ? `${user.email.trim()} • ${normalizedRole}` : user.email.trim();
  }
  return null;
}

export default function Sidebar({ currentUser, currentView, onNavigate, onOpenClientPicker, onSignOut, connectionStatus }) {
  const { t } = useI18n();
  const userRole = currentUser?.role ?? null;
  const visibleNavItems = NAV_ITEMS.filter((item) => canViewNavItem(item, userRole));
  const CONNECTION_TONE = {
    loading: { color: 'gray', label: t('sidebar.connection.loading') },
    connected: { color: 'green', label: t('sidebar.connection.connected') },
    error: { color: 'red', label: t('sidebar.connection.error') },
  };
  const connectionTone = CONNECTION_TONE[connectionStatus] ?? CONNECTION_TONE.loading;
  const userLabel = resolveUserLabel(currentUser, userRole) ?? (userRole ? t('sidebar.user.signedInAs', { role: userRole.replaceAll('_', ' ') }) : t('sidebar.user.notSignedIn'));

  return (
    <Stack h="100%" gap={0} p="sm">
      <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 8 }}>
        <Group gap="sm" mb="md" px="xs" className="sidebar-options-head">
          <Box className="sidebar-options-mark" aria-hidden="true">
            <span className="sidebar-options-glow"></span>
            <span className="sidebar-options-person sidebar-options-person--left"></span>
            <span className="sidebar-options-person sidebar-options-person--right"></span>
            <span className="sidebar-options-wave"></span>
          </Box>
          <Box>
            <Text fw={800} fz="sm" lh={1.1}>{t('sidebar.options')}</Text>
          </Box>
        </Group>

        <Text
          id="userBadge"
          fz="xs"
          c="dimmed"
          px="xs"
          mb={6}
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 999,
            padding: '6px 12px',
            display: 'inline-block',
          }}
        >
          {userLabel}
        </Text>

        <Box px="xs" mb="sm">
          <Badge
            color={connectionTone.color}
            variant="light"
            radius="xl"
            size="md"
          >
            {connectionTone.label}
          </Badge>
        </Box>

        <Stack gap={2} component="nav" aria-label={t('sidebar.primaryNav')}>
          {visibleNavItems.map((item) =>
            item.href ? (
              <NavLink
                key={item.key}
                data-nav-key={item.key}
                component="a"
                href={item.href}
                label={t(item.labelKey)}
                styles={{ root: { borderRadius: 8 } }}
              />
            ) : (
              <NavLink
                key={item.key}
                data-nav-key={item.key}
                label={t(item.labelKey)}
                active={currentView === item.key}
                onClick={() => onNavigate?.(item.key)}
                styles={{ root: { borderRadius: 8 } }}
              />
            )
          )}
        </Stack>
      </Box>

      <Box mt="sm">
        <Divider mb="sm" />
        <Button variant="default" fullWidth onClick={onSignOut}>
          {t('header.signOut')}
        </Button>
      </Box>
    </Stack>
  );
}
