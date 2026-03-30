import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button, SimpleGrid, Card,
  Badge, Loader, Alert, Select, NumberInput, Textarea, Modal, TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';
import { frontendTelemetry } from '../../lib/frontendTelemetry.js';
import { useI18n } from '../../lib/i18nContext.jsx';
import { csrfHeaders } from '../../lib/csrf.js';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

function formatCurrency(cents) {
  if (typeof cents !== 'number') return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OfferingsPage({ clients = [] }) {
  const { t } = useI18n();
  useSurfaceTelemetry('offerings', { surfaceKind: 'view', workflow: 'navigation' });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState({
    clientId: '',
    amountDollars: 0,
    receivedOn: new Date().toISOString().slice(0, 10),
    note: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [offeringsData, summaryData] = await Promise.all([
        apiFetch('/v1/offerings'),
        apiFetch('/v1/offerings/summary'),
      ]);
      setOfferings(offeringsData?.items ?? []);
      setSummary(summaryData);
      frontendTelemetry.trackSurfaceLoad('offerings', 'success');
    } catch (err) {
      setLoadError(err.message || 'Failed to load offerings.');
      frontendTelemetry.trackSurfaceLoad('offerings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRecord() {
    if (!draft.clientId) {
      notifications.show({ title: 'Client required', message: 'Select a client before recording.', color: 'yellow' });
      return;
    }
    setRecording(true);
    try {
      await apiFetch('/v1/offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          clientId: draft.clientId,
          amountCents: Math.round((draft.amountDollars ?? 0) * 100),
          receivedOn: draft.receivedOn,
          note: draft.note || undefined,
        }),
      });
      setModalOpen(false);
      setDraft({ clientId: '', amountDollars: 0, receivedOn: new Date().toISOString().slice(0, 10), note: '' });
      await load();
      notifications.show({ title: 'Recorded', message: 'Offering recorded successfully.', color: 'green' });
      frontendTelemetry.trackAction('offerings', 'record_offering', 'success', { workflow: 'offerings' });
    } catch (err) {
      notifications.show({ title: 'Failed', message: err.message || 'Unable to record offering.', color: 'red' });
      frontendTelemetry.trackAction('offerings', 'record_offering', 'failure', { workflow: 'offerings' });
    } finally {
      setRecording(false);
    }
  }

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.id,
  }));

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{t('offerings.title')}</Title>
          <Text c="dimmed" size="sm">{t('offerings.subtitle')}</Text>
        </div>
        <Button onClick={() => setModalOpen(true)} variant="filled">
          {t('offerings.recordOffering')}
        </Button>
      </Group>

      {loadError ? (
        <Alert color="red" title="Load error">{loadError}</Alert>
      ) : null}

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card withBorder radius="md" p="md">
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('offerings.thisMonth')}</Text>
          <Text fw={700} mt={8}>{loading ? '—' : formatCurrency(summary?.thisMonthCents ?? 0)}</Text>
        </Card>
        <Card withBorder radius="md" p="md">
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('offerings.yearToDate')}</Text>
          <Text fw={700} mt={8}>{loading ? '—' : formatCurrency(summary?.yearToDateCents ?? 0)}</Text>
        </Card>
        <Card withBorder radius="md" p="md">
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('offerings.totalOfferings')}</Text>
          <Text fw={700} mt={8}>{loading ? '—' : formatCurrency(summary?.totalCents ?? 0)}</Text>
          <Text size="xs" c="dimmed" mt={4}>{loading ? '' : `${summary?.count ?? 0} session(s)`}</Text>
        </Card>
        <Card withBorder radius="md" p="md">
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('offerings.averageOffering')}</Text>
          <Text fw={700} mt={8}>{loading ? '—' : formatCurrency(summary?.averageCents ?? 0)}</Text>
        </Card>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Title order={4} mb="md">{t('offerings.offeringsTitle', { defaultValue: 'Offering history' })}</Title>
        {loading ? (
          <Group py="md"><Loader size="sm" /><Text c="dimmed" size="sm">Loading…</Text></Group>
        ) : offerings.length === 0 ? (
          <Text c="dimmed" size="sm">{t('offerings.noOfferings')}</Text>
        ) : (
          <Stack gap="xs">
            {offerings.map((offering) => {
              const client = clients.find((c) => c.id === offering.clientId);
              const clientLabel = client
                ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || offering.clientId
                : offering.clientId;
              return (
                <Paper key={offering.id} withBorder radius="sm" p="sm">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={600}>{formatCurrency(offering.amountCents)}</Text>
                      <Text size="sm" c="dimmed">{clientLabel} · {formatDate(offering.receivedOn)}</Text>
                      {offering.note ? <Text size="sm" mt={4}>{offering.note}</Text> : null}
                    </div>
                    <Badge variant="light" color="teal">received</Badge>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('offerings.recordOffering')}
        size="sm"
      >
        <Stack gap="sm">
          <Select
            label="Client"
            placeholder="Select a client"
            data={clientOptions}
            value={draft.clientId}
            onChange={(val) => setDraft((d) => ({ ...d, clientId: val ?? '' }))}
            searchable
            required
          />
          <NumberInput
            label="Amount"
            prefix="$"
            decimalScale={2}
            fixedDecimalScale
            min={0}
            max={9999}
            step={5}
            value={draft.amountDollars}
            onChange={(val) => setDraft((d) => ({ ...d, amountDollars: typeof val === 'number' ? val : 0 }))}
          />
          <TextInput
            label="Date received"
            type="date"
            value={draft.receivedOn}
            onChange={(e) => setDraft((d) => ({ ...d, receivedOn: e.currentTarget.value }))}
          />
          <Textarea
            label="Note (optional)"
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.currentTarget.value }))}
            maxLength={500}
            rows={2}
          />
          <Button onClick={handleRecord} loading={recording} fullWidth>
            {t('offerings.recordOffering')}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
