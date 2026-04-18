import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Button, Textarea, Select, Badge,
  ActionIcon, Loader, Alert, TextInput, Divider, SimpleGrid, Progress,
  Accordion, Checkbox,
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

const FAITH_LEVEL_OPTIONS = [
  { value: '',         label: '— Not specified —' },
  { value: 'none',     label: 'None — secular clinical focus' },
  { value: 'light',    label: 'Light — faith acknowledged, not central' },
  { value: 'moderate', label: 'Moderate — faith integrated alongside clinical work' },
  { value: 'full',     label: 'Full — explicitly faith-based throughout' },
];

const CHRISTIAN_INTERVENTION_OPTIONS = [
  { value: 'prayer',                    label: 'Personal prayer' },
  { value: 'intercessory_prayer',       label: 'Intercessory / guided prayer' },
  { value: 'scripture_reading',         label: 'Scripture reading' },
  { value: 'scripture_memorization',    label: 'Scripture memorization' },
  { value: 'confession_forgiveness',    label: 'Confession & forgiveness exercises' },
  { value: 'spiritual_direction',       label: 'Spiritual direction sessions' },
  { value: 'fasting',                   label: 'Fasting' },
  { value: 'worship',                   label: 'Worship / praise' },
  { value: 'church_community',          label: 'Church / faith community involvement' },
  { value: 'discipleship_mentoring',    label: 'Discipleship or mentoring' },
  { value: 'biblical_counseling_homework', label: 'Biblical counseling homework' },
  { value: 'journaling',                label: 'Reflective journaling' },
  { value: 'contemplative_prayer',      label: 'Contemplative / centering prayer' },
  { value: 'accountability_partner',    label: 'Accountability partner' },
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

function EditableList({ items, onChange, placeholder, addLabel, spiritualFlags, onFlagChange }) {
  const handleChange = (idx, value) => {
    const next = [...items];
    next[idx] = value;
    onChange(next);
  };
  const handleAdd = () => onChange([...items, '']);
  const handleRemove = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
    if (onFlagChange) {
      const nextFlags = [...(spiritualFlags ?? [])];
      nextFlags.splice(idx, 1);
      onFlagChange(nextFlags);
    }
  };

  return (
    <Stack gap="xs">
      {items.map((item, idx) => (
        <Group key={idx} gap="xs" wrap="nowrap" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Textarea
              value={item}
              onChange={(e) => handleChange(idx, e.currentTarget.value)}
              placeholder={placeholder}
              minRows={1}
              autosize
            />
            {onFlagChange && (
              <Checkbox
                size="xs"
                label="Spiritual / faith-integrated goal"
                checked={!!(spiritualFlags?.[idx])}
                onChange={(e) => {
                  const next = [...(spiritualFlags ?? items.map(() => false))];
                  next[idx] = e.currentTarget.checked;
                  onFlagChange(next);
                }}
                styles={{ label: { color: 'var(--mantine-color-teal-7)', fontSize: '0.72rem' } }}
              />
            )}
          </Stack>
          <ActionIcon
            color="red"
            variant="light"
            size="sm"
            onClick={() => handleRemove(idx)}
            aria-label="Remove"
            style={{ flexShrink: 0, marginTop: 6 }}
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
    goalFlags: [],           // parallel array of booleans — true = spiritual goal
    interventions: [''],
    reviewCadence: '',
    reviewedAt: '',
    // Faith integration fields
    presentingProblem: '',
    faithIntegrationLevel: '',
    christianInterventions: [],
    spiritualGoals: [''],
    scriptureAssignments: '',
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
          goalFlags: Array.isArray(p.goals) ? p.goals.map(() => false) : [],
          interventions: Array.isArray(p.interventions) && p.interventions.length > 0 ? p.interventions : [''],
          reviewCadence: p.reviewCadence ?? '',
          reviewedAt: p.reviewedAt ? new Date(p.reviewedAt).toISOString().slice(0, 10) : '',
          presentingProblem: p.presentingProblem ?? '',
          faithIntegrationLevel: p.faithIntegrationLevel ?? '',
          christianInterventions: Array.isArray(p.christianInterventions) ? p.christianInterventions : [],
          spiritualGoals: Array.isArray(p.spiritualGoals) && p.spiritualGoals.length > 0 ? p.spiritualGoals : [''],
          scriptureAssignments: p.scriptureAssignments ?? '',
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

  const toggleChristianIntervention = (value) => {
    setForm((f) => {
      const next = f.christianInterventions.includes(value)
        ? f.christianInterventions.filter((v) => v !== value)
        : [...f.christianInterventions, value];
      return { ...f, christianInterventions: next };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    const goals = form.goals.map((g) => g.trim()).filter(Boolean);
    if (goals.length === 0) {
      notifications.show({ title: 'Required', message: 'At least one goal is required.', color: 'yellow' });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/treatment-plan`, {
        method: 'PUT',
        headers: csrfHeaders(),
        body: JSON.stringify({
          status: form.status,
          goals,
          interventions: form.interventions.map((i) => i.trim()).filter(Boolean),
          reviewCadence: form.reviewCadence || undefined,
          reviewedAt: form.reviewedAt || undefined,
          presentingProblem: form.presentingProblem || undefined,
          faithIntegrationLevel: form.faithIntegrationLevel || undefined,
          christianInterventions: form.christianInterventions.length ? form.christianInterventions : undefined,
          spiritualGoals: form.spiritualGoals.map((g) => g.trim()).filter(Boolean),
          scriptureAssignments: form.scriptureAssignments || undefined,
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

  const activeFaithCount = form.christianInterventions.length;
  const faithLevelLabel = FAITH_LEVEL_OPTIONS.find((o) => o.value === form.faithIntegrationLevel)?.label ?? '—';

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
        <Group gap="xs">
          {plan?.faithIntegrationLevel && plan.faithIntegrationLevel !== 'none' && (
            <Badge color="teal" variant="light">Faith-integrated</Badge>
          )}
          {plan && (
            <Badge color={STATUS_COLORS[plan.status] ?? 'gray'} variant="light">
              {t(`chart.plan.status.${plan.status}`) || plan.status}
            </Badge>
          )}
        </Group>
      </Group>

      {!plan && (
        <Text c="dimmed" size="sm">{t('chart.plan.noPlan')}</Text>
      )}

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Paper withBorder radius="xl" p="md" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,255,0.92))' }}>
          <Text size="xs" tt="uppercase" fw={700} c="indigo" style={{ letterSpacing: '0.08em' }}>
            Plan status
          </Text>
          <Group justify="space-between" align="center" mt="sm">
            <Text fw={700} size="lg">{t(`chart.plan.status.${form.status}`) || form.status}</Text>
            <Badge color={STATUS_COLORS[form.status] ?? 'gray'} variant="light">
              {form.status}
            </Badge>
          </Group>
          <Progress
            value={form.status === 'completed' ? 100 : form.status === 'active' ? 72 : form.status === 'on_hold' ? 44 : 24}
            color={STATUS_COLORS[form.status] ?? 'gray'}
            radius="xl"
            mt="md"
          />
        </Paper>

        <Paper withBorder radius="xl" p="md" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,255,0.92))' }}>
          <Text size="xs" tt="uppercase" fw={700} c="indigo" style={{ letterSpacing: '0.08em' }}>
            Goal coverage
          </Text>
          <Text fw={800} fz="2rem" mt="sm">
            {form.goals.map((goal) => goal.trim()).filter(Boolean).length}
          </Text>
          <Text size="sm" c="dimmed">
            Active goals currently written into the plan.
          </Text>
          <Progress
            value={Math.min(100, form.goals.map((goal) => goal.trim()).filter(Boolean).length * 20)}
            color="indigo"
            radius="xl"
            mt="md"
          />
        </Paper>

        <Paper withBorder radius="xl" p="md" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,255,0.92))' }}>
          <Text size="xs" tt="uppercase" fw={700} c="indigo" style={{ letterSpacing: '0.08em' }}>
            Faith integration
          </Text>
          <Text fw={700} size="sm" mt="sm" lineClamp={2}>
            {faithLevelLabel}
          </Text>
          <Text size="xs" c="teal" mt={4}>
            {activeFaithCount > 0
              ? `${activeFaithCount} Christian intervention${activeFaithCount !== 1 ? 's' : ''} selected`
              : 'No Christian interventions selected'}
          </Text>
          <Progress
            value={activeFaithCount > 0 ? Math.min(100, activeFaithCount * 15) : (form.faithIntegrationLevel && form.faithIntegrationLevel !== 'none' ? 20 : 0)}
            color="teal"
            radius="xl"
            mt="md"
          />
        </Paper>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Stack gap="md">

          {/* ── Core plan fields ── */}
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

          <Textarea
            label={t('chart.plan.presentingProblem')}
            description={t('chart.plan.presentingProblemHint')}
            placeholder={t('chart.plan.presentingProblemPlaceholder')}
            value={form.presentingProblem}
            onChange={(e) => update('presentingProblem', e.currentTarget.value)}
            minRows={2}
            autosize
          />

          <Divider />

          {/* ── Clinical goals ── */}
          <div>
            <Text fw={600} size="sm" mb="xs">{t('chart.plan.goals')}</Text>
            <Text size="xs" c="dimmed" mb="sm">
              Each goal should be specific, measurable, and time-bound. Check the box to mark a goal as faith-integrated.
            </Text>
            <EditableList
              items={form.goals}
              onChange={(v) => update('goals', v)}
              placeholder={t('chart.plan.goalPlaceholder')}
              addLabel={t('chart.plan.addGoal')}
              spiritualFlags={form.goalFlags}
              onFlagChange={(v) => update('goalFlags', v)}
            />
          </div>

          <Divider />

          {/* ── Clinical interventions ── */}
          <div>
            <Text fw={600} size="sm" mb="xs">{t('chart.plan.interventions')}</Text>
            <Text size="xs" c="dimmed" mb="sm">
              Document therapeutic modalities, techniques, and homework. Use the Faith Integration section below for structured faith-based practices.
            </Text>
            <EditableList
              items={form.interventions}
              onChange={(v) => update('interventions', v)}
              placeholder={t('chart.plan.interventionPlaceholder')}
              addLabel={t('chart.plan.addIntervention')}
            />
          </div>

          <Divider label="Faith Integration" labelPosition="center" />

          {/* ── Faith integration section ── */}
          <Accordion variant="separated" radius="md">
            <Accordion.Item value="faith-core">
              <Accordion.Control>
                <Group gap="xs">
                  <Text fw={600} size="sm">{t('chart.plan.faithIntegrationLevel')}</Text>
                  {form.faithIntegrationLevel && form.faithIntegrationLevel !== 'none' && (
                    <Badge color="teal" variant="light" size="xs">Active</Badge>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Select
                    label={t('chart.plan.faithIntegrationLevel')}
                    description={t('chart.plan.faithIntegrationLevelHint')}
                    data={FAITH_LEVEL_OPTIONS}
                    value={form.faithIntegrationLevel}
                    onChange={(val) => update('faithIntegrationLevel', val ?? '')}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="christian-interventions">
              <Accordion.Control>
                <Group gap="xs">
                  <Text fw={600} size="sm">{t('chart.plan.christianInterventions')}</Text>
                  {activeFaithCount > 0 && (
                    <Badge color="teal" variant="filled" size="xs">{activeFaithCount}</Badge>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="xs" c="dimmed" mb="sm">{t('chart.plan.christianInterventionsHint')}</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  {CHRISTIAN_INTERVENTION_OPTIONS.map((opt) => (
                    <Checkbox
                      key={opt.value}
                      label={opt.label}
                      checked={form.christianInterventions.includes(opt.value)}
                      onChange={() => toggleChristianIntervention(opt.value)}
                      size="sm"
                    />
                  ))}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="spiritual-goals">
              <Accordion.Control>
                <Group gap="xs">
                  <Text fw={600} size="sm">{t('chart.plan.spiritualGoals')}</Text>
                  {form.spiritualGoals.filter((g) => g.trim()).length > 0 && (
                    <Badge color="teal" variant="light" size="xs">
                      {form.spiritualGoals.filter((g) => g.trim()).length}
                    </Badge>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="xs" c="dimmed" mb="sm">{t('chart.plan.spiritualGoalsHint')}</Text>
                <EditableList
                  items={form.spiritualGoals}
                  onChange={(v) => update('spiritualGoals', v)}
                  placeholder={t('chart.plan.spiritualGoalPlaceholder')}
                  addLabel={t('chart.plan.addSpiritualGoal')}
                />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="scripture-assignments">
              <Accordion.Control>
                <Group gap="xs">
                  <Text fw={600} size="sm">{t('chart.plan.scriptureAssignments')}</Text>
                  {form.scriptureAssignments && (
                    <Badge color="teal" variant="dot" size="xs">Set</Badge>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Textarea
                  description={t('chart.plan.scriptureAssignmentsHint')}
                  placeholder={t('chart.plan.scriptureAssignmentsPlaceholder')}
                  value={form.scriptureAssignments}
                  onChange={(e) => update('scriptureAssignments', e.currentTarget.value)}
                  minRows={3}
                  autosize
                />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

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
