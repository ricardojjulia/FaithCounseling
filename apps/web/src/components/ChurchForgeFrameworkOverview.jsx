import { useEffect } from 'react';
import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { frontendTelemetry } from '../lib/frontendTelemetry.js';
import { useI18n } from '../lib/i18nContext.jsx';
import { getChurchManagementFramework } from '../lib/churchManagementFramework.js';

function FrameworkCard({ title, summary, badge, color = 'gray', status = null }) {
  return (
    <Paper withBorder radius="md" p="md" h="100%">
      <Stack gap="sm" h="100%">
        <Group justify="space-between" align="flex-start" gap="xs">
          <Text fw={700} fz="sm" style={{ flex: 1 }}>{title}</Text>
          {badge ? (
            <Badge color={color} variant="light">
              {badge}
            </Badge>
          ) : null}
        </Group>
        <Text c="dimmed" fz="sm" style={{ flex: 1 }}>{summary}</Text>
        {status ? (
          <Badge color={color} variant="dot" size="sm" styles={{ root: { alignSelf: 'flex-start' } }}>
            {status}
          </Badge>
        ) : null}
      </Stack>
    </Paper>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <Title order={3} fz="md">{title}</Title>
      <Text c="dimmed" fz="sm" mt={4}>{subtitle}</Text>
    </div>
  );
}

export default function ChurchForgeFrameworkOverview({
  onOpenScheduling,
  onOpenDocuments,
  onOpenPortal,
}) {
  const { t } = useI18n();
  const framework = getChurchManagementFramework(t);

  useEffect(() => {
    frontendTelemetry.trackAction('dashboard', 'church_framework_view', 'success', {
      workflow: 'church_management_framework',
    });
  }, []);

  const handleFoundationAction = (action, callback) => {
    frontendTelemetry.trackAction('dashboard', action, 'success', {
      workflow: 'church_management_framework',
    });
    callback?.();
  };

  return (
    <Stack p="md" pt={0} gap="md">
      <Paper
        withBorder
        radius="lg"
        p="lg"
        style={{
          background: 'linear-gradient(135deg, rgba(221, 234, 254, 0.88), rgba(246, 248, 255, 0.95))',
          overflow: 'hidden',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" gap="md">
            <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
              <Badge color="indigo" variant="light" size="lg" styles={{ root: { alignSelf: 'flex-start' } }}>
                {t('churchFramework.kicker')}
              </Badge>
              <Title order={2}>{t('churchFramework.title')}</Title>
              <Text c="dimmed" maw={820}>
                {t('churchFramework.subtitle')}
              </Text>
            </Stack>
            <Group gap="sm" wrap="wrap" justify="flex-end">
              <Button
                variant="default"
                onClick={() => handleFoundationAction('open_scheduling_foundation', onOpenScheduling)}
              >
                {t('churchFramework.cta.scheduling')}
              </Button>
              <Button
                variant="default"
                onClick={() => handleFoundationAction('open_documents_foundation', onOpenDocuments)}
              >
                {t('churchFramework.cta.documents')}
              </Button>
              <Button
                variant="default"
                onClick={() => handleFoundationAction('open_portal_foundation', onOpenPortal)}
              >
                {t('churchFramework.cta.portal')}
              </Button>
            </Group>
          </Group>

          <Group gap="xs">
            {framework.posture.map((item) => (
              <Badge key={item.key} color={item.color} variant="light" size="md">
                {item.label}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Paper withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text fw={700}>{t('churchFramework.currentState.title')}</Text>
            <Text c="dimmed" fz="sm">{t('churchFramework.currentState.body')}</Text>
          </Stack>
        </Paper>
        <Paper withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text fw={700}>{t('churchFramework.integration.title')}</Text>
            <Text c="dimmed" fz="sm">{t('churchFramework.integration.body')}</Text>
          </Stack>
        </Paper>
      </SimpleGrid>

      <Stack gap="sm">
        <SectionHeader
          title={t('churchFramework.roles.title')}
          subtitle={t('churchFramework.roles.subtitle')}
        />
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          {framework.rolePortals.map((item) => (
            <FrameworkCard
              key={item.key}
              title={item.title}
              summary={item.summary}
              badge={item.badge}
              color={item.color}
            />
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap="sm">
        <SectionHeader
          title={t('churchFramework.modules.title')}
          subtitle={t('churchFramework.modules.subtitle')}
        />
        <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
          {framework.coreModules.map((item) => (
            <FrameworkCard
              key={item.key}
              title={item.title}
              summary={item.summary}
              status={item.status}
              color={item.color}
            />
          ))}
        </SimpleGrid>
      </Stack>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <SectionHeader
              title={t('churchFramework.ai.title')}
              subtitle={t('churchFramework.ai.subtitle')}
            />
            <Stack gap="sm">
              {framework.aiSuite.map((item) => (
                <Paper key={item.key} withBorder radius="sm" p="sm">
                  <Text fw={600} fz="sm">{item.title}</Text>
                  <Text c="dimmed" fz="sm" mt={4}>{item.summary}</Text>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <SectionHeader
              title={t('churchFramework.guardrails.title')}
              subtitle={t('churchFramework.guardrails.subtitle')}
            />
            <Group gap="xs">
              {framework.deliveryRails.map((item) => (
                <Badge key={item} color="dark" variant="outline" size="lg">
                  {item}
                </Badge>
              ))}
            </Group>
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
