import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Badge, Loader, Alert, Divider, Table,
} from '@mantine/core';
import { useI18n } from '../../../lib/i18nContext.jsx';
import { frontendTelemetry } from '../../../lib/frontendTelemetry.js';

const STATUS_COLORS = {
  assigned:    'blue',
  in_progress: 'yellow',
  completed:   'teal',
  cancelled:   'gray',
};

const STATUS_LABELS = {
  assigned:    'Assigned',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

const TIMING_LABELS = {
  next_session:         'Next Session',
  future_session:       'Future Session',
  scheduled_recurring:  'Recurring',
  account_signup:       'On Signup',
};

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

export default function HomeworkTab({ clientId }) {
  const { t } = useI18n();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch(`/api/v1/forms/client-overview?clientId=${encodeURIComponent(clientId)}`);
      const all = [
        ...(data?.assignments ?? []),
        ...(data?.pending ?? []),
      ];
      // Deduplicate by id
      const seen = new Set();
      const deduped = all.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      setAssignments(deduped);
      frontendTelemetry.trackSurfaceLoad('chart.homework', 'success');
    } catch (err) {
      // Fallback: try assignments endpoint directly
      try {
        const data2 = await apiFetch(`/api/v1/forms/assignments?clientId=${encodeURIComponent(clientId)}`);
        setAssignments(data2?.items ?? []);
        frontendTelemetry.trackSurfaceLoad('chart.homework', 'success');
      } catch (err2) {
        setLoadError(err2.message || err.message);
        frontendTelemetry.trackSurfaceLoad('chart.homework', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <Group py="lg"><Loader size="sm" /><Text c="dimmed" size="sm">Loading homework assignments…</Text></Group>;
  }
  if (loadError) {
    return <Alert color="red">{loadError}</Alert>;
  }

  const pending = assignments.filter((a) => a.status !== 'completed' && a.status !== 'cancelled');
  const completed = assignments.filter((a) => a.status === 'completed');
  const cancelled = assignments.filter((a) => a.status === 'cancelled');

  const sortByDate = (arr) =>
    [...arr].sort((a, b) => new Date(b.assignedAt ?? b.createdAt ?? 0) - new Date(a.assignedAt ?? a.createdAt ?? 0));

  if (assignments.length === 0) {
    return (
      <Stack gap="md">
        <Title order={4}>{t('chart.tab.homework')}</Title>
        <Text c="dimmed" size="sm">{t('chart.homework.noHomework')}</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Title order={4}>{t('chart.tab.homework')}</Title>

      {pending.length > 0 && (
        <Paper withBorder radius="md" p="md">
          <Text fw={600} size="sm" mb="sm">{t('chart.homework.pending')} ({pending.length})</Text>
          <Stack gap="xs">
            {sortByDate(pending).map((a) => (
              <Paper key={a.id} withBorder radius="sm" p="sm">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fw={500} size="sm">{a.formTitle ?? a.formKey ?? 'Unknown Form'}</Text>
                    <Group gap="xs" mt={4}>
                      <Badge
                        color={STATUS_COLORS[a.status] ?? 'gray'}
                        variant="light"
                        size="xs"
                      >
                        {STATUS_LABELS[a.status] ?? a.status}
                      </Badge>
                      {a.assignmentType && (
                        <Badge color="indigo" variant="dot" size="xs">
                          {TIMING_LABELS[a.assignmentType] ?? a.assignmentType}
                        </Badge>
                      )}
                    </Group>
                    {a.counselorNotes && (
                      <Text size="xs" c="dimmed" mt={4}>{a.counselorNotes}</Text>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {a.dueAt && (
                      <Text size="xs" c="dimmed">{t('chart.homework.dueBy')}: {formatDate(a.dueAt)}</Text>
                    )}
                    <Text size="xs" c="dimmed">{t('chart.homework.assignedOn')}: {formatDate(a.assignedAt ?? a.createdAt)}</Text>
                  </div>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {completed.length > 0 && (
        <Paper withBorder radius="md" p="md">
          <Text fw={600} size="sm" mb="sm">{t('chart.homework.completed')} ({completed.length})</Text>
          <Table striped highlightOnHover withTableBorder={false} fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Form</Table.Th>
                <Table.Th>Assigned</Table.Th>
                <Table.Th>Completed</Table.Th>
                <Table.Th>Type</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortByDate(completed).map((a, idx) => (
                <Table.Tr key={a.id ?? idx}>
                  <Table.Td>{a.formTitle ?? a.formKey ?? '—'}</Table.Td>
                  <Table.Td>{formatDate(a.assignedAt ?? a.createdAt)}</Table.Td>
                  <Table.Td>{formatDate(a.completedAt)}</Table.Td>
                  <Table.Td>
                    <Badge color="indigo" variant="light" size="xs">
                      {TIMING_LABELS[a.assignmentType] ?? a.assignmentType ?? '—'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {cancelled.length > 0 && (
        <Text size="xs" c="dimmed">{cancelled.length} cancelled assignment(s) not shown.</Text>
      )}
    </Stack>
  );
}
