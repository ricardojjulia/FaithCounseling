import { Alert, Group, Text, ThemeIcon } from '@mantine/core';
import { useI18n } from '../../lib/i18nContext.jsx';

/**
 * Always-visible safety disclaimer banner.
 * Shows an elevated critical-state variant when any client has critical urgency.
 */
export default function SafetyBanner({ hasCriticalClient = false }) {
  const { t } = useI18n();

  if (hasCriticalClient) {
    return (
      <Alert
        color="red"
        variant="filled"
        radius={0}
        styles={{ root: { borderRadius: 0 }, message: { display: 'flex', flexDirection: 'column', gap: 2 } }}
      >
        <Group gap="xs" wrap="nowrap">
          <ThemeIcon color="white" variant="transparent" size="sm">⚠</ThemeIcon>
          <Text fw={700} size="sm" c="white">{t('workflow.safetyBannerCritical')}</Text>
        </Group>
        <Text size="xs" c="red.1">{t('workflow.safetyBanner')}</Text>
      </Alert>
    );
  }

  return (
    <Alert
      color="yellow"
      variant="light"
      radius={0}
      styles={{ root: { borderRadius: 0 } }}
    >
      <Text size="xs" c="dimmed">{t('workflow.safetyBanner')}</Text>
    </Alert>
  );
}
