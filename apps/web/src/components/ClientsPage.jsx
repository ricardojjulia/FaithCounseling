import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import ClientModal from './ClientModal.jsx';
import { useI18n } from '../lib/i18nContext.jsx';

function resolveClientFullName(client) {
  return [client?.firstName, client?.lastName]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .trim();
}

function formatStatusLabel(status, t) {
  if (!status) return t('clientsPage.none');
  const translated = t(`status.${status}`);
  return translated === `status.${status}` ? status : translated;
}

function statusTone(status) {
  switch (status) {
    case 'active':
      return 'green';
    case 'waitlist':
      return 'yellow';
    case 'inactive':
      return 'gray';
    case 'discharged':
      return 'blue';
    default:
      return 'gray';
  }
}

function SummaryCard({ label, value, help }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>{label}</Text>
      <Text fw={700} fz="xl" mt={6}>{value}</Text>
      {help ? <Text c="dimmed" fz="xs" mt={4}>{help}</Text> : null}
    </Paper>
  );
}

export default function ClientsPage({
  clientsData,
  onClientsUpdated,
  onViewClient,
  onScheduleClient,
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalState, setModalState] = useState({ open: false, client: null });

  const items = Array.isArray(clientsData?.items) ? clientsData.items : [];
  const loading = Boolean(clientsData?.loading);
  const error = clientsData?.error ?? null;
  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = items.filter((client) => {
    const fullName = resolveClientFullName(client).toLowerCase();
    const faithBackground = String(client?.faithBackground ?? '').toLowerCase();
    const clientStatus = String(client?.status ?? '').toLowerCase();
    const matchesQuery = !normalizedQuery
      || fullName.includes(normalizedQuery)
      || faithBackground.includes(normalizedQuery)
      || clientStatus.includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all' || clientStatus === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const activeCount = items.filter((client) => client?.status === 'active').length;
  const waitlistCount = items.filter((client) => client?.status === 'waitlist').length;
  const highTouchpointCount = items.filter((client) => Boolean(client?.highTouchpoint)).length;

  const openCreateModal = () => setModalState({ open: true, client: null });
  const closeModal = () => setModalState({ open: false, client: null });

  return (
    <>
      <Stack gap="lg" p="xl" style={{ minHeight: 0, flex: 1 }}>
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Title order={2}>{t('clientsPage.title')}</Title>
            <Text c="dimmed" mt={4}>{t('clientsPage.subtitle')}</Text>
          </div>
          <Button onClick={openCreateModal}>
            {t('clients.newClient')}
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <SummaryCard label={t('clientsPage.totalClients')} value={items.length} />
          <SummaryCard label={t('clientsPage.activeClients')} value={activeCount} />
          <SummaryCard label={t('clientsPage.waitlistClients')} value={waitlistCount} />
          <SummaryCard
            label={t('clientsPage.highTouchpointClients')}
            value={highTouchpointCount}
            help={t('clientsPage.highTouchpointHelp')}
          />
        </SimpleGrid>

        <Group align="end" gap="md">
          <TextInput
            label={t('clientsPage.searchLabel')}
            placeholder={t('clientsPage.searchPlaceholder')}
            aria-label={t('clientsPage.searchLabel')}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            label={t('clientsPage.statusFilterLabel')}
            aria-label={t('clientsPage.statusFilterLabel')}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || 'all')}
            data={[
              { value: 'all', label: t('clientsPage.allStatuses') },
              { value: 'active', label: formatStatusLabel('active', t) },
              { value: 'waitlist', label: formatStatusLabel('waitlist', t) },
              { value: 'inactive', label: formatStatusLabel('inactive', t) },
              { value: 'discharged', label: formatStatusLabel('discharged', t) },
            ]}
            w={220}
          />
        </Group>

        <Text c="dimmed" fz="sm">
          {t('clientsPage.resultsCount', { count: filteredItems.length, total: items.length })}
        </Text>

        {loading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : error ? (
          <Alert color="red" variant="light">{error}</Alert>
        ) : filteredItems.length === 0 ? (
          <Paper withBorder radius="md" p="xl">
            <Text fw={600}>{t('clientsPage.emptyTitle')}</Text>
            <Text c="dimmed" mt={4}>{t('clientsPage.emptyBody')}</Text>
          </Paper>
        ) : (
          <ScrollArea type="auto" style={{ flex: 1 }}>
            <Stack gap="sm" pb="xs">
              {filteredItems.map((client) => {
                const fullName = resolveClientFullName(client) || t('clientsPage.unnamedClient');
                const faithBackground = client?.faithBackground || t('clients.faithUndeclared');

                return (
                  <Paper key={client.id} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" gap="md">
                      <Stack gap={6} style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Text fw={700}>{fullName}</Text>
                          <Badge color={statusTone(client?.status)} variant="light">
                            {formatStatusLabel(client?.status, t)}
                          </Badge>
                          {client?.highTouchpoint ? (
                            <Badge color="grape" variant="light">
                              {t('clientsPage.highTouchpointBadge')}
                            </Badge>
                          ) : null}
                        </Group>
                        <Text c="dimmed" fz="sm">
                          {t('clients.faithPrefix')}: {faithBackground}
                        </Text>
                        <Text c="dimmed" fz="sm">
                          {t('clients.statusPrefix')}: {formatStatusLabel(client?.status, t)}
                        </Text>
                      </Stack>
                      <Group gap="xs">
                        <Button variant="default" size="xs" onClick={() => onViewClient?.(client.id)}>
                          {t('actions.edit')}
                        </Button>
                        <Button variant="default" size="xs" onClick={() => onScheduleClient?.(client.id)}>
                          {t('clients.schedule')}
                        </Button>
                        <Button size="xs" onClick={() => setModalState({ open: true, client })}>
                          {t('clientsPage.quickEdit')}
                        </Button>
                      </Group>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </ScrollArea>
        )}
      </Stack>

      <ClientModal
        isOpen={modalState.open}
        initialClient={modalState.client}
        onClose={closeModal}
        onSubmit={() => {
          onClientsUpdated?.();
        }}
      />
    </>
  );
}
