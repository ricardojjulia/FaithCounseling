import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Button, Badge, Table, Loader,
  Alert, ActionIcon, Select,
} from '@mantine/core';
import { IconPlus, IconTrash, IconDownload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../../lib/csrf.js';
import { frontendTelemetry } from '../../lib/frontendTelemetry.js';
import QuickLogModal from './QuickLogModal.jsx';
import LicensureProgressBars from './LicensureProgressBars.jsx';

const CATEGORY_LABELS = {
  direct_clinical:        'Direct Clinical',
  indirect_admin:         'Indirect / Admin',
  supervision_individual: 'Individual Supervision',
  supervision_group:      'Group Supervision',
  ce_spiritual:           'CE / Spiritual Formation',
  ministry_coordination:  'Ministry Coordination',
};

const CATEGORY_COLORS = {
  direct_clinical:        'blue',
  indirect_admin:         'gray',
  supervision_individual: 'violet',
  supervision_group:      'grape',
  ce_spiritual:           'teal',
  ministry_coordination:  'orange',
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function SummaryCards({ summary }) {
  if (!summary.length) return null;
  return (
    <Group gap="sm" wrap="wrap">
      {summary.map((s) => (
        <Paper key={s.category} withBorder radius="lg" p="sm" style={{ minWidth: 160 }}>
          <Badge color={CATEGORY_COLORS[s.category] ?? 'gray'} variant="light" mb={4}>
            {CATEGORY_LABELS[s.category] ?? s.category}
          </Badge>
          <Text fw={700} size="lg">{Math.floor(s.totalMinutes / 60)}h {s.totalMinutes % 60}m</Text>
          <Text size="xs" c="dimmed">{s.entryCount} {s.entryCount === 1 ? 'entry' : 'entries'}</Text>
        </Paper>
      ))}
    </Group>
  );
}

export default function TimeTrackingPage({ currentUser }) {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catQuery = categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : '';
      const [entriesData, summaryData] = await Promise.all([
        fetch(`/api/v1/time-entries?${catQuery}`).then((r) => r.json()),
        fetch('/api/v1/time-entries/summary').then((r) => r.json()),
      ]);
      setEntries(entriesData.items ?? []);
      setSummary(summaryData.summary ?? []);
      frontendTelemetry.trackSurfaceLoad('time_tracking', 'success');
    } catch (err) {
      setError(err.message);
      frontendTelemetry.trackSurfaceLoad('time_tracking', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this time entry?')) return;
    try {
      const res = await fetch(`/api/v1/time-entries/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: csrfHeaders(),
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Delete failed');
      }
      await loadData();
      notifications.show({ title: 'Deleted', message: 'Time entry removed.', color: 'red' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleExportCsv = () => {
    const catQuery = categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : '';
    // Trigger browser download — session cookie is sent automatically
    window.location.assign(`/api/v1/time-entries/export?${catQuery}`);
    frontendTelemetry.trackAction('time_tracking', 'export_csv', 'success', {});
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Time Tracking</Title>
        <Group gap="xs">
          <Button
            leftSection={<IconDownload size={16} />}
            variant="default"
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setLogOpen(true)}>
            Quick Log
          </Button>
        </Group>
      </Group>

      <LicensureProgressBars userId={currentUser?.id} />

      <SummaryCards summary={summary} />

      <Group gap="sm" align="flex-end">
        <Select
          label="Filter by category"
          data={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(v) => setCategoryFilter(v ?? '')}
          style={{ minWidth: 240 }}
        />
      </Group>

      {error && <Alert color="red">{error}</Alert>}

      {loading ? (
        <Group py="lg"><Loader size="sm" /><Text c="dimmed" size="sm">Loading time entries…</Text></Group>
      ) : entries.length === 0 ? (
        <Text c="dimmed" size="sm">No time entries found. Use Quick Log to add one.</Text>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category</Table.Th>
                <Table.Th>Start</Table.Th>
                <Table.Th>End</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Notes</Table.Th>
                <Table.Th style={{ width: 48 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Badge color={CATEGORY_COLORS[entry.category] ?? 'gray'} variant="light" size="sm">
                      {CATEGORY_LABELS[entry.category] ?? entry.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDateTime(entry.startTime)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDateTime(entry.endTime)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={1}>{entry.description ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    {!entry.isLocked && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        aria-label="Delete entry"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <QuickLogModal
        opened={logOpen}
        onClose={() => setLogOpen(false)}
        onCreated={() => loadData()}
      />
    </Stack>
  );
}
