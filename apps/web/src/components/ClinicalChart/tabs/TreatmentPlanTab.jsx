import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Button, Textarea, Select, Badge,
  ActionIcon, Loader, Alert, TextInput, Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useI18n } from '../../../lib/i18nContext.jsx';
import { csrfHeaders } from '../../../lib/csrf.js';
import { frontendTelemetry } from '../../../lib/frontendTelemetry.js';

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_COLORS = {
  draft:     'gray',
  active:    'green',
  on_hold:   'yellow',
  completed: 'teal',
};

const CADENCE_OPTIONS = [
  { value: '',           label: '— None —' },
  { value: 'weekly',     label: 'Weekly' },
  { value: 'biweekly',   label: 'Biweekly' },
  { value: 'monthly',    label: 'Monthly' },
  { value: 'quarterly',  label: 'Quarterly' },
];

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function EditableList({ items, onChange, placeholder, addLabel }) {
  const handleChange = (idx, value) => {
    const next = [...items];
    next[idx] = value;
    onChange(next);
  };
  const handleAdd = () => onChange([...items, '']);
  const handleRemove = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <Stack gap="xs">
      {items.map((item, idx) => (
        <Group key={idx} gap="xs" wrap="nowrap">
          <Textarea
            style={{ flex: 1 }}
            value={item}
            onChange={(e) => handleChange(idx, e.currentTarget.value)}
            placeholder={placeholder}
            minRows={1}
            autosize
          />
          <ActionIcon
            color="red"
            variant="light"
            size="sm"
            onClick={() => handleRemove(idx)}
            aria-label="Remove"
            style={{ flexShrink: 0 }}
          >
            ×
          </ActionIcon>
        </Group>
      ))}
      <Button size="xs" variant="light" onClick={handleAdd}>{addLabel}</Button>
    </Stack>
  );
}

export default function TreatmentPlanTab({ clientId }) {
  const { t } = useI18n();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState({
    status: 'draft',
    goals: [''],
    interventions: [''],
    reviewCadence: '',
    reviewedAt: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/treatment-plan`);
      const p = data?.item ?? null;
      setPlan(p);
      if (p) {
        setForm({
          status: p.status ?? 'draft',
          goals: Array.isArray(p.goals) && p.goals.length > 0 ? p.goals : [''],
          interventions: Array.isArray(p.interventions) && p.interventions.length > 0 ? p.interventions : [''],
          reviewCadence: p.reviewCadence ?? '',
          reviewedAt: p.reviewedAt ? new Date(p.reviewedAt).toISOString().slice(0, 10) : '',
        });
      }
      setDirty(false);
      frontendTelemetry.trackSurfaceLoad('chart.treatment_plan', 'success');
    } catch (err) {
      setLoadError(err.message);
      frontendTelemetry.trackSurfaceLoad('chart.treatment_plan', 'error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    const goals = form.goals.map((g) => g.trim()).filter(Boolean);
    const interventions = form.interventions.map((i) => i.trim()).filter(Boolean);
    if (goals.length === 0) {
      notifications.show({ title: 'Required', message: 'At least one goal is required.', color: 'yellow' });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/treatment-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          status: form.status,
          goals,
          interventions,
          reviewCadence: form.reviewCadence || undefined,
          reviewedAt: form.reviewedAt || undefined,
        }),
      });
      await load();
      notifications.show({ title: 'Saved', message: 'Treatment plan updated.', color: 'green' });
      frontendTelemetry.trackAction('chart.treatment_plan', 'save_plan', 'success', { workflow: 'clinical_chart' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
      frontendTelemetry.trackAction('chart.treatment_plan', 'save_plan', 'failure', { workflow: 'clinical_chart' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Group py="lg"><Loader size="sm" /><Text c="dimmed" size="sm">Loading treatment plan…</Text></Group>;
  }

  if (loadError) {
    return <Alert color="red">{loadError}</Alert>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={4}>{t('chart.tab.treatmentPlan')}</Title>
          {plan && (
            <Text size="xs" c="dimmed" mt={2}>
              Last updated: {formatDate(plan.updatedAt)}
              {plan.reviewedAt ? ` · Reviewed: ${formatDate(plan.reviewedAt)}` : ''}
            </Text>
          )}
        </div>
        {plan && (
          <Badge color={STATUS_COLORS[plan.status] ?? 'gray'} variant="light">
            {t(`chart.plan.status.${plan.status}`) || plan.status}
          </Badge>
        )}
      </Group>

      {!plan && (
        <Text c="dimmed" size="sm">{t('chart.plan.noPlan')}</Text>
      )}

      <Paper withBorder radius="md" p="md">
        <Stack gap="md">
          <Group gap="md" grow>
            <Select
              label={t('chart.plan.status')}
              data={STATUS_OPTIONS}
              value={form.status}
              onChange={(val) => update('status', val ?? 'draft')}
            />
            <Select
              label={t('chart.plan.reviewCadence')}
              data={CADENCE_OPTIONS}
              value={form.reviewCadence}
              onChange={(val) => update('reviewCadence', val ?? '')}
            />
            <TextInput
              label={t('chart.plan.lastReviewed')}
              type="date"
              value={form.reviewedAt}
              onChange={(e) => update('reviewedAt', e.currentTarget.value)}
            />
          </Group>

          <Divider />

          <div>
            <Text fw={600} size="sm" mb="xs">{t('chart.plan.goals')}</Text>
            <Text size="xs" c="dimmed" mb="sm">
              Each goal should be specific, measurable, and time-bound. Include spiritual goals where clinically indicated.
            </Text>
            <EditableList
              items={form.goals}
              onChange={(v) => update('goals', v)}
              placeholder={t('chart.plan.goalPlaceholder')}
              addLabel={t('chart.plan.addGoal')}
            />
          </div>

          <Divider />

          <div>
            <Text fw={600} size="sm" mb="xs">{t('chart.plan.interventions')}</Text>
            <Text size="xs" c="dimmed" mb="sm">
              Document therapeutic modalities, techniques, homework, and faith-based practices.
            </Text>
            <EditableList
              items={form.interventions}
              onChange={(v) => update('interventions', v)}
              placeholder={t('chart.plan.interventionPlaceholder')}
              addLabel={t('chart.plan.addIntervention')}
            />
          </div>

          <Group justify="flex-end">
            <Button onClick={handleSave} loading={saving} disabled={!dirty && !!plan}>
              {t('chart.plan.savePlan')}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
