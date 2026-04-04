import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Badge, Loader, Alert, Divider, Table, SimpleGrid,
} from '@mantine/core';
import { useI18n } from '../../../lib/i18nContext.jsx';
import { frontendTelemetry } from '../../../lib/frontendTelemetry.js';

// Severity band definitions for scored instruments
const SEVERITY_BANDS = {
  'PHQ-9': [
    { max: 4,  label: 'Minimal',           color: 'green' },
    { max: 9,  label: 'Mild',              color: 'lime' },
    { max: 14, label: 'Moderate',          color: 'yellow' },
    { max: 19, label: 'Moderately Severe', color: 'orange' },
    { max: 27, label: 'Severe',            color: 'red' },
  ],
  'GAD-7': [
    { max: 4,  label: 'Minimal',  color: 'green' },
    { max: 9,  label: 'Mild',     color: 'lime' },
    { max: 14, label: 'Moderate', color: 'yellow' },
    { max: 21, label: 'Severe',   color: 'red' },
  ],
  'BAI': [
    { max: 7,  label: 'Minimal',  color: 'green' },
    { max: 15, label: 'Mild',     color: 'lime' },
    { max: 25, label: 'Moderate', color: 'yellow' },
    { max: 63, label: 'Severe',   color: 'red' },
  ],
  'PCL-5': [
    { max: 32, label: 'Below Threshold', color: 'green' },
    { max: 80, label: 'Probable PTSD',   color: 'red' },
  ],
  'OCI-R': [
    { max: 20, label: 'Subclinical', color: 'green' },
    { max: 72, label: 'OCD Likely',  color: 'red' },
  ],
  'AUDIT': [
    { max: 7,  label: 'Low Risk',    color: 'green' },
    { max: 15, label: 'Hazardous',   color: 'yellow' },
    { max: 19, label: 'Harmful',     color: 'orange' },
    { max: 40, label: 'Dependent',   color: 'red' },
  ],
  'ISI': [
    { max: 7,  label: 'No Insomnia',         color: 'green' },
    { max: 14, label: 'Subthreshold',        color: 'lime' },
    { max: 21, label: 'Moderate Insomnia',   color: 'yellow' },
    { max: 28, label: 'Severe Insomnia',     color: 'red' },
  ],
  'RSES': [
    { max: 15, label: 'Low Self-Esteem',    color: 'red' },
    { max: 24, label: 'Normal',             color: 'green' },
    { max: 30, label: 'High Self-Esteem',   color: 'teal' },
  ],
  'DASS-21': [
    { max: 9,  label: 'Normal',              color: 'green' },
    { max: 13, label: 'Mild',                color: 'lime' },
    { max: 20, label: 'Moderate',            color: 'yellow' },
    { max: 27, label: 'Severe',              color: 'orange' },
    { max: 42, label: 'Extremely Severe',    color: 'red' },
  ],
  'ACE': [
    { max: 3,  label: 'Lower Risk', color: 'green' },
    { max: 10, label: 'Elevated Risk (dose-response)', color: 'red' },
  ],
};

function getSeverityBadge(scoreLabel, scoreValue) {
  if (scoreValue == null || !scoreLabel) return null;
  // Try to match by known instrument label key words
  const key = Object.keys(SEVERITY_BANDS).find((k) =>
    scoreLabel.toUpperCase().includes(k) || (scoreLabel.toUpperCase().includes('PHQ') && k === 'PHQ-9'),
  );
  if (!key) return null;
  const bands = SEVERITY_BANDS[key];
  const band = bands.find((b) => scoreValue <= b.max);
  if (!band) return null;
  return <Badge color={band.color} variant="light" size="sm">{band.label}</Badge>;
}

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

function buildSparklinePoints(values, width = 140, height = 42) {
  if (values.length <= 1) {
    return `0,${height / 2} ${width},${height / 2}`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (((value - min) / span) * (height - 8) + 4);
      return `${x},${y}`;
    })
    .join(' ');
}

function Sparkline({ values }) {
  const points = buildSparklinePoints(values);
  return (
    <svg width="140" height="42" viewBox="0 0 140 42" aria-hidden="true">
      <polyline
        fill="none"
        stroke="var(--mantine-color-indigo-6)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function ScoreDeltaBadge({ latest, previous }) {
  if (latest == null || previous == null) {
    return <Badge color="gray" variant="light">Baseline</Badge>;
  }

  const delta = Number(latest) - Number(previous);
  if (delta === 0) {
    return <Badge color="gray" variant="light">No change</Badge>;
  }
  return (
    <Badge color={delta > 0 ? 'red' : 'teal'} variant="light">
      {delta > 0 ? `+${delta}` : `${delta}`} vs prior
    </Badge>
  );
}

export default function ProgressTab({ clientId }) {
  const { t } = useI18n();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch(`/api/v1/forms/submissions?clientId=${encodeURIComponent(clientId)}`);
      setSubmissions(data?.items ?? []);
      frontendTelemetry.trackSurfaceLoad('chart.progress', 'success');
    } catch (err) {
      setLoadError(err.message);
      frontendTelemetry.trackSurfaceLoad('chart.progress', 'error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <Group py="lg"><Loader size="sm" /><Text c="dimmed" size="sm">Loading assessment history…</Text></Group>;
  }
  if (loadError) {
    return <Alert color="red">{loadError}</Alert>;
  }

  // Separate scored from unscored
  const scored = submissions.filter((s) => s.scoreValue != null);
  const unscored = submissions.filter((s) => s.scoreValue == null);

  // Group scored by formTitle
  const byForm = scored.reduce((acc, s) => {
    const key = s.formTitle ?? s.formKey ?? 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  // Sort each group newest first
  Object.values(byForm).forEach((arr) => arr.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));

  const sortedFormKeys = Object.keys(byForm).sort();
  const latestScored = [...scored].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const recentScored = latestScored.slice(0, 3);

  return (
    <Stack gap="md">
      <Title order={4}>{t('chart.tab.progress')}</Title>

      {scored.length === 0 && unscored.length === 0 && (
        <Text c="dimmed" size="sm">{t('chart.progress.noScores')}</Text>
      )}

      {recentScored.length > 0 && (
        <SimpleGrid cols={{ base: 1, md: Math.min(3, recentScored.length) }} spacing="md">
          {recentScored.map((submission) => {
            const formTitle = submission.formTitle ?? submission.formKey ?? 'Assessment';
            const entries = byForm[formTitle] ?? [];
            const trendValues = [...entries]
              .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
              .map((entry) => Number(entry.scoreValue))
              .filter((value) => Number.isFinite(value))
              .slice(-6);
            return (
              <Paper
                key={submission.id ?? `${formTitle}-${submission.submittedAt}`}
                withBorder
                radius="xl"
                p="md"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,255,0.92))',
                  boxShadow: '0 16px 34px rgba(34, 51, 93, 0.08)',
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="indigo" style={{ letterSpacing: '0.08em' }}>
                        Current signal
                      </Text>
                      <Text fw={700}>{formTitle}</Text>
                    </div>
                    {getSeverityBadge(submission.scoreLabel, submission.scoreValue)}
                  </Group>
                  <Group justify="space-between" align="flex-end" wrap="nowrap">
                    <div>
                      <Text fw={800} fz="2rem" style={{ lineHeight: 1 }}>
                        {submission.scoreValue ?? '—'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {submission.interpretationLabel ?? submission.scoreLabel ?? 'Scored assessment'}
                      </Text>
                    </div>
                    {trendValues.length > 0 ? <Sparkline values={trendValues} /> : null}
                  </Group>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      )}

      {sortedFormKeys.map((formTitle) => {
        const entries = byForm[formTitle];
        const latest = entries[0];
        const previous = entries[1];
        const trendValues = [...entries]
          .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
          .map((entry) => Number(entry.scoreValue))
          .filter((value) => Number.isFinite(value))
          .slice(-6);
        return (
          <Paper key={formTitle} withBorder radius="md" p="md">
            <Group justify="space-between" align="flex-start" mb="xs">
              <div>
                <Text fw={600} size="sm">{formTitle}</Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Latest completed {formatDate(latest.submittedAt)}
                </Text>
              </div>
              <Group gap="xs" align="center">
                <ScoreDeltaBadge latest={latest.scoreValue} previous={previous?.scoreValue} />
                {latest.scoreLabel && (
                  <Badge color="blue" variant="filled" size="sm">
                    {latest.scoreLabel}: {latest.scoreValue}
                  </Badge>
                )}
              </Group>
            </Group>

            <Group justify="space-between" align="center" mb="sm">
              <Group gap="xs">
                {getSeverityBadge(latest.scoreLabel, latest.scoreValue)}
                <Badge color="gray" variant="light">{entries.length} entries</Badge>
              </Group>
              {trendValues.length > 1 ? <Sparkline values={trendValues} /> : null}
            </Group>

            {entries.length === 1 ? (
              <Text size="xs" c="dimmed">
                Completed: {formatDate(latest.submittedAt)}
                {latest.interpretationLabel ? ` · ${latest.interpretationLabel}` : ''}
              </Text>
            ) : (
              <Table striped highlightOnHover withTableBorder={false} fz="xs" mt="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Score</Table.Th>
                    <Table.Th>Interpretation</Table.Th>
                    <Table.Th>Severity</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {entries.map((s, idx) => (
                    <Table.Tr key={s.id ?? idx}>
                      <Table.Td>{formatDate(s.submittedAt)}</Table.Td>
                      <Table.Td>
                        <Text fw={idx === 0 ? 700 : 400} size="xs">{s.scoreValue ?? '—'}</Text>
                      </Table.Td>
                      <Table.Td>{s.interpretationLabel ?? '—'}</Table.Td>
                      <Table.Td>{getSeverityBadge(s.scoreLabel, s.scoreValue) ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        );
      })}

      {unscored.length > 0 && (
        <>
          {scored.length > 0 && <Divider label={t('chart.progress.allSubmissions')} labelPosition="left" />}
          <Paper withBorder radius="md" p="md">
            <Text fw={600} size="sm" mb="xs">{t('chart.progress.allSubmissions')}</Text>
            <Table striped highlightOnHover withTableBorder={false} fz="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Assessment</Table.Th>
                  <Table.Th>Completed</Table.Th>
                  <Table.Th>By</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {unscored
                  .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                  .map((s, idx) => (
                    <Table.Tr key={s.id ?? idx}>
                      <Table.Td>{s.formTitle ?? s.formKey ?? '—'}</Table.Td>
                      <Table.Td>{formatDate(s.submittedAt)}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" size="xs" color={s.submittedByType === 'counselor' ? 'blue' : 'gray'}>
                          {s.submittedByType === 'counselor' ? 'Counselor' : 'Client'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </>
      )}
    </Stack>
  );
}
