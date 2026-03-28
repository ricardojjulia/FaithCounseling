import { useState } from 'react';
import { Burger, Group, Select, Badge, Text, Box } from '@mantine/core';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'pt', label: 'Português' },
];

const STATUS_CONFIG = {
  loading:   { color: 'gray',  label: 'Connecting…' },
  connected: { color: 'green', label: 'API Connected' },
  error:     { color: 'red',   label: 'Connection Error' },
};

export default function TopBar({ opened, onMenuToggle, connectionStatus }) {
  const [language, setLanguage] = useState('en');
  const status = STATUS_CONFIG[connectionStatus] ?? STATUS_CONFIG.loading;

  return (
    <Group className="workspace-topbar" h="100%" px="md" justify="space-between" wrap="nowrap">
      <Group gap="md" wrap="nowrap" className="workspace-topbar-main">
        <Burger opened={opened} onClick={onMenuToggle} aria-label="Toggle navigation" size="sm" />
        <Box className="topbar-counseling-scene" aria-hidden="true">
          <span className="topbar-scene-glow"></span>
          <span className="topbar-person topbar-person--left"></span>
          <span className="topbar-person topbar-person--right"></span>
          <span className="topbar-bubble topbar-bubble--left"></span>
          <span className="topbar-bubble topbar-bubble--right"></span>
        </Box>
        <Box className="workspace-topbar-copy">
          <Text className="workspace-topbar-kicker">Faith Counseling Workspace</Text>
          <Text className="workspace-topbar-title">Practice Operations Center</Text>
          <Text className="workspace-topbar-subtitle">
            Care delivery, scheduling, billing, reporting, and oversight in one flow.
          </Text>
        </Box>
      </Group>

      <Group gap="sm" wrap="nowrap" className="workspace-topbar-actions">
        <Select
          data={LANGUAGES}
          value={language}
          onChange={setLanguage}
          size="xs"
          w={120}
          aria-label="Language"
        />
        <Badge color={status.color} variant="light" size="lg" radius="xl">{status.label}</Badge>
      </Group>
    </Group>
  );
}
