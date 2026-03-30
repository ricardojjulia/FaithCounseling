import { Burger, Group, Select, Text, Box, Button } from '@mantine/core';
import { useI18n } from '../lib/i18nContext.jsx';

function resolveTopBarCopy(currentView, isClient, t) {
  if (isClient) {
    return {
      title: t('topbar.portal.title'),
      subtitle: t('topbar.portal.subtitle'),
    };
  }

  if (currentView === 'clients') {
    return {
      title: t('topbar.clients.title'),
      subtitle: t('topbar.clients.subtitle'),
    };
  }

  return {
    title: t('topbar.title'),
    subtitle: t('topbar.subtitle'),
  };
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
        <Select
          data={locales}
          value={locale}
          onChange={(value) => value && setLocale(value)}
          disabled={loading}
          size="xs"
          w={120}
          aria-label={t('header.language')}
        />
        <Button size="xs" variant="default" onClick={onSignOut}>
          {t('header.signOut')}
        </Button>
      </Group>
    </Group>
  );
}
