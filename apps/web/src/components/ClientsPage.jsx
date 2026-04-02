import { useState, useEffect, useCallback } from 'react';
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
import ClientSessionsModal from './ClientSessionsModal.jsx';
import { useI18n } from '../lib/i18nContext.jsx';
import { csrfHeaders } from '../lib/csrf.js';

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
  intakePreviewItems = [],
  onClientsUpdated,
  onViewClient,
  onScheduleClient,
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalState, setModalState] = useState({ open: false, client: null });
  const [sessionsModal, setSessionsModal] = useState({ open: false, clientId: null, clientName: '' });
  const [localItems, setLocalItems] = useState([]);
  const [htpLoading, setHtpLoading] = useState(new Set());
  const [htpError, setHtpError] = useState(null);

  const loading = Boolean(clientsData?.loading);
  const error = clientsData?.error ?? null;

  useEffect(() => {
    setLocalItems(Array.isArray(clientsData?.items) ? clientsData.items : []);
  }, [clientsData?.items]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = localItems.filter((client) => {
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

  const activeCount = localItems.filter((client) => client?.status === 'active').length;
  const waitlistCount = localItems.filter((client) => client?.status === 'waitlist').length;
  const highTouchpointCount = localItems.filter((client) => Boolean(client?.highTouchpoint)).length;
  const intakePreviewClientIds = new Set(
    (Array.isArray(intakePreviewItems) ? intakePreviewItems : [])
      .map((item) => item?.clientId)
      .filter(Boolean),
  );

  const openCreateModal = () => setModalState({ open: true, client: null });
  const closeModal = () => setModalState({ open: false, client: null });

  const handleToggleHighTouchpoint = useCallback(async (clientId, currentValue) => {
    const newValue = !currentValue;
    setHtpError(null);
    setHtpLoading((prev) => new Set([...prev, clientId]));
    // Optimistic update
    setLocalItems((prev) => prev.map((c) => c.id === clientId ? { ...c, highTouchpoint: newValue } : c));
    try {
      const res = await fetch(`/api/v1/clients/${encodeURIComponent(clientId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ highTouchpoint: newValue }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch {
      // Rollback
      setLocalItems((prev) => prev.map((c) => c.id === clientId ? { ...c, highTouchpoint: currentValue } : c));
      setHtpError(t('clientsPage.highTouchpointUpdateFailed'));
    } finally {
      setHtpLoading((prev) => { const next = new Set(prev); next.delete(clientId); return next; });
    }
  }, [t]);

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
          <SummaryCard label={t('clientsPage.totalClients')} value={localItems.length} />
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
          {t('clientsPage.resultsCount', { count: filteredItems.length, total: localItems.length })}
        </Text>

        {htpError ? (
          <Alert color="red" variant="light" withCloseButton onClose={() => setHtpError(null)}>
            {htpError}
          </Alert>
        ) : null}

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
                const isHtp = Boolean(client?.highTouchpoint);
                const hasIntakePreview = intakePreviewClientIds.has(client.id);

                return (
                  <Paper key={client.id} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" gap="md">
                      <Stack gap={6} style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Text fw={700}>{fullName}</Text>
                          <Badge color={statusTone(client?.status)} variant="light">
                            {formatStatusLabel(client?.status, t)}
                          </Badge>
                          <Button
                            size="compact-xs"
                            variant={isHtp ? 'filled' : 'outline'}
                            color="grape"
                            loading={htpLoading.has(client.id)}
                            onClick={() => handleToggleHighTouchpoint(client.id, isHtp)}
                            title={t('clientsPage.highTouchpointToggleHint')}
                          >
                            {t('clientsPage.highTouchpointBadge')}
                          </Button>
                          {hasIntakePreview ? (
                            <Badge color="yellow" variant="light">
                              {t('clientsPage.intakePreviewBadge')}
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
                        {hasIntakePreview ? (
                          <Button
                            variant="default"
                            size="xs"
                            onClick={() => onViewClient?.({ clientId: client.id, initialTab: 'intakePreview' })}
                          >
                            {t('clientsPage.openPreview')}
                          </Button>
                        ) : null}
                        <Button variant="default" size="xs" onClick={() => onViewClient?.(client.id)}>
                          {t('actions.edit')}
                        </Button>
                        <Button
                          variant="default"
                          size="xs"
                          onClick={() => setSessionsModal({ open: true, clientId: client.id, clientName: fullName })}
                        >
                          {t('clientsPage.sessionsButton')}
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

      <ClientSessionsModal
        opened={sessionsModal.open}
        clientId={sessionsModal.clientId}
        clientName={sessionsModal.clientName}
        onClose={() => setSessionsModal({ open: false, clientId: null, clientName: '' })}
      />
    </>
  );
}
