import { useState, useEffect } from 'react';
import {
  Stack, NumberInput, Button, Paper, Title, Text, SimpleGrid, Card,
  Alert, Loader, Group, Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../../../lib/csrf.js';
import { useSurfaceTelemetry } from '../../../lib/useSurfaceTelemetry.js';
import { frontendTelemetry } from '../../../lib/frontendTelemetry.js';
import { useI18n } from '../../../lib/i18nContext.jsx';

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

function centsToDollars(cents) {
  const amount = Number(cents ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return amount / 100;
}

export default function OfferingsTab() {
  const { t } = useI18n();
  useSurfaceTelemetry('studio.offerings', { surfaceKind: 'tab', workflow: 'workspace_studio' });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [suggestedCents, setSuggestedCents] = useState(0);
  const [suggestedDraft, setSuggestedDraft] = useState(0);
  const [savedMinistryNote, setSavedMinistryNote] = useState('');
  const [ministryNote, setMinistryNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [settingsData, summaryData] = await Promise.all([
          apiFetch('/api/v1/portal/settings'),
          apiFetch('/api/v1/offerings/summary'),
        ]);
        if (!cancelled) {
          const cents = settingsData?.item?.suggestedOfferingCents ?? 0;
          setSuggestedCents(cents);
          setSuggestedDraft(centsToDollars(cents));
          const note = settingsData?.item?.offeringMinistryNote ?? '';
          setMinistryNote(note);
          setSavedMinistryNote(note);
          setSummary(summaryData);
          frontendTelemetry.trackSurfaceLoad('studio.offerings', 'success');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load offerings data.');
          frontendTelemetry.trackSurfaceLoad('studio.offerings', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const amountCents = Math.round((suggestedDraft ?? 0) * 100);
      await apiFetch('/api/v1/portal/settings', {
        method: 'PATCH',
        headers: csrfHeaders(),
        body: JSON.stringify({
          suggestedOfferingCents: amountCents,
          offeringMinistryNote: ministryNote,
        }),
      });
      setSuggestedCents(amountCents);
      setSuggestedDraft(centsToDollars(amountCents));
      setSavedMinistryNote(ministryNote);
      notifications.show({ title: 'Saved', message: 'Suggested offering amount updated.', color: 'green' });
      frontendTelemetry.trackAction('studio.offerings', 'save_suggested', 'success', { workflow: 'workspace_studio' });
    } catch (err) {
      notifications.show({ title: 'Save failed', message: err.message || 'Unable to save.', color: 'red' });
      frontendTelemetry.trackAction('studio.offerings', 'save_suggested', 'failure', { workflow: 'workspace_studio' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="sm" />
        <Text c="dimmed" size="sm">Loading offerings data…</Text>
      </Stack>
    );
  }

  if (loadError) {
    return (
      <Alert color="red" title="Load error">
        {loadError}
      </Alert>
    );
  }

  const dirty = Math.round((suggestedDraft ?? 0) * 100) !== suggestedCents || ministryNote !== savedMinistryNote;

  return (
    <Stack gap="lg">
      <Title order={4}>{t('offerings.title')}</Title>
      <Text c="dimmed" size="sm">{t('offerings.subtitle')}</Text>

      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Title order={5}>{t('offerings.suggestedLabel')}</Title>
          <Text size="sm" c="dimmed">{t('offerings.suggestedHelp')}</Text>
          <Group align="flex-end" gap="sm">
            <NumberInput
              label={t('offerings.suggestedLabel')}
              description={t('offerings.suggestedHelp')}
              prefix="$"
              decimalScale={2}
              fixedDecimalScale
              min={0}
              max={9999}
              step={5}
              value={suggestedDraft}
              onChange={(val) => setSuggestedDraft(typeof val === 'number' ? val : 0)}
              maw={240}
            />
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!dirty}
              variant="filled"
            >
              {t('offerings.saveSuggested')}
            </Button>
          </Group>
          <Textarea
            label={t('offerings.ministryNoteLabel')}
            description={t('offerings.ministryNoteHelp')}
            value={ministryNote}
            onChange={(event) => setMinistryNote(event.currentTarget.value)}
            maxLength={1000}
            autosize
            minRows={3}
          />
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Title order={5} mb="md">{t('offerings.summaryTitle')}</Title>
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('offerings.thisMonth')}</Text>
            <Text fw={700} mt={8}>{formatCurrency(summary?.thisMonthCents ?? 0)}</Text>
          </Card>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('offerings.yearToDate')}</Text>
            <Text fw={700} mt={8}>{formatCurrency(summary?.yearToDateCents ?? 0)}</Text>
          </Card>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('offerings.totalOfferings')}</Text>
            <Text fw={700} mt={8}>{formatCurrency(summary?.totalCents ?? 0)}</Text>
            <Text size="xs" c="dimmed" mt={4}>{summary?.count ?? 0} session(s)</Text>
          </Card>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('offerings.averageOffering')}</Text>
            <Text fw={700} mt={8}>{formatCurrency(summary?.averageCents ?? 0)}</Text>
          </Card>
        </SimpleGrid>
        {(summary?.count ?? 0) === 0 ? (
          <Text c="dimmed" size="sm" mt="md">{t('offerings.noOfferings')}</Text>
        ) : null}
      </Paper>
    </Stack>
  );
}
