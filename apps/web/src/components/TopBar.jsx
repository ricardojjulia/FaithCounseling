import { Burger, Group, Select, Text, Box, Button, ActionIcon, Tooltip, Badge } from '@mantine/core';
import { useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { useI18n } from '../lib/i18nContext.jsx';

function resolveTopBarCopy(currentView, isClient, t) {
  if (isClient) {
    return {
      title: t('topbar.portal.title'),
      subtitle: t('topbar.portal.subtitle'),
    };
  }

  const viewKeyMap = {
    'counselor-home': 'counselorHome',
    tasks: 'tasks',
    dashboard: 'dashboard',
    users: 'users',
    counselors: 'counselors',
    clients: 'clients',
    scheduling: 'scheduling',
    documents: 'documents',
    'workspace-studio': 'workspaceStudio',
    clinical: 'clinical',
    offerings: 'offerings',
    portal: 'portal',
    faith: 'faith',
  };

  const key = viewKeyMap[currentView];
  if (key) {
    return {
      title: t(`topbar.${key}.title`),
      subtitle: t(`topbar.${key}.subtitle`),
    };
  }

  return {
    title: t('topbar.dashboard.title'),
    subtitle: t('topbar.dashboard.subtitle'),
  };
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computed === 'dark';
  return (
    <Tooltip label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} withArrow>
      <ActionIcon
        variant="default"
        size="sm"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
      >
        {isDark ? '☀' : '☾'}
      </ActionIcon>
    </Tooltip>
  );
}

export default function TopBar({ opened, onMenuToggle, onSignOut, currentUser, currentView }) {
  const { locale, locales, setLocale, t, loading } = useI18n();
  const isClient = currentUser?.role === 'client';
  const copy = resolveTopBarCopy(currentView, isClient, t);

  return (
    <Group className="workspace-topbar" h="100%" px="md" justify="space-between" wrap="nowrap">
      <Group gap="md" wrap="nowrap" className="workspace-topbar-main">
        <Burger opened={opened} onClick={onMenuToggle} aria-label={t('topbar.toggleNavigation')} size="sm" />
        <Box
          className="topbar-counseling-scene"
          aria-hidden="true"
          style={{ cursor: 'default' }}
          onClick={(e) => { if (e.shiftKey) window.location.href = '/monitor'; }}
        >
          <span className="topbar-scene-glow"></span>
          <span className="topbar-person topbar-person--left"></span>
          <span className="topbar-person topbar-person--right"></span>
          <span className="topbar-bubble topbar-bubble--left"></span>
          <span className="topbar-bubble topbar-bubble--right"></span>
        </Box>
        <Box className="workspace-topbar-copy">
          <Text className="workspace-topbar-kicker">{t('topbar.kicker')}</Text>
          <Text component="h1" className="workspace-topbar-title" style={{ margin: 0 }}>{copy.title}</Text>
          <Text className="workspace-topbar-subtitle">
            {copy.subtitle}
          </Text>
        </Box>
      </Group>

      <Group gap="sm" wrap="nowrap" className="workspace-topbar-actions">
        <ColorSchemeToggle />
        <Select
          data={locales}
          value={locale}
          onChange={(value) => value && setLocale(value)}
          disabled={loading}
          size="xs"
          w={140}
          aria-label={t('header.language')}
          renderOption={({ option }) => {
            const completion = option.completion ?? 100;
            const status = option.status ?? 'complete';
            return (
              <Group gap={6} wrap="nowrap" style={{ width: '100%' }}>
                <Text size="xs" style={{ flex: 1 }}>{option.label}</Text>
                {status === 'stub' && (
                  <Badge size="xs" color="gray" variant="light">stub</Badge>
                )}
                {status === 'partial' && (
                  <Badge size="xs" color="violet" variant="light">{completion}%</Badge>
                )}
              </Group>
            );
          }}
        />
        <Button size="xs" variant="default" onClick={onSignOut}>
          {t('header.signOut')}
        </Button>
      </Group>
    </Group>
  );
}
