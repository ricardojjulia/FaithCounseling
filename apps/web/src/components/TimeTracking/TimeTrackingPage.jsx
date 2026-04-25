import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Button, Badge, Table, Loader,
  Alert, ActionIcon, Select,
} from '@mantine/core';
import { Check, Download, Plus, Trash2 } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../../lib/csrf.js';
import QuickLogModal from './QuickLogModal.jsx';
import LicensureProgressBars from './LicensureProgressBars.jsx';

const CATEGORY_LABELS = {
  direct_clinical: 'Direct Clinical',
  indirect_admin: 'Indirect / Admin',
  supervision_individual: 'Individual Supervision',
  supervision_group: 'Group Supervision',
  ce_spiritual: 'CE / Spiritual Formation',
  ministry_coordination: 'Ministry Coordination',
};

const CATEGORY_COLORS = {
  direct_clinical: 'blue',
  indirect_admin: 'gray',
  supervision_individual: 'violet',
  supervision_group: 'grape',
  ce_spiritual: 'teal',
  ministry_coordination: 'orange',
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

const SUPERVISION_CATEGORIES = new Set(['supervision_individual', 'supervision_group']);

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(minutes) {
  const totalMinutes = Number(minutes ?? 0);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function formatStaffName(staff) {
  const fullName = [staff?.firstName, staff?.lastName].filter(Boolean).join(' ').trim();
  return fullName || staff?.email || staff?.id || 'Unknown counselor';
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return body;
}

function SummaryCards({ summary }) {
  if (!summary.length) return null;
  return (
    <Group gap="sm" wrap="wrap">
      {summary.map((item) => (
        <Paper key={item.category} withBorder radius="lg" p="sm" style={{ minWidth: 160 }}>
          <Badge color={CATEGORY_COLORS[item.category] ?? 'gray'} variant="light" mb={4}>
            {CATEGORY_LABELS[item.category] ?? item.category}
          </Badge>
          <Text fw={700} size="lg">{formatDuration(item.totalMinutes)}</Text>
          <Text size="xs" c="dimmed">
            {item.entryCount} {item.entryCount === 1 ? 'entry' : 'entries'}
          </Text>
        </Paper>
      ))}
    </Group>
  );
}

function VerificationBadge({ entry }) {
  if (!SUPERVISION_CATEGORIES.has(entry.category)) {
    return <Badge color="gray" variant="light">Not Required</Badge>;
  }
  if (entry.verifiedAt) {
    return <Badge color="teal" variant="light">Verified</Badge>;
  }
  return <Badge color="yellow" variant="light">Pending</Badge>;
}

function PendingVerificationSection({ items, staffById, verifyingId, onVerify }) {
  if (!items.length) return null;
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <div>
          <Title order={4}>Pending Verification</Title>
          <Text c="dimmed" size="sm">
            Supervision entries stay out of licensure totals until a supervisor verifies them.
          </Text>
        </div>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Counselor</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Start</Table.Th>
              <Table.Th>Duration</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: 104 }}>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>
                  <Text size="sm">{staffById[entry.userId] ?? entry.userId}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={CATEGORY_COLORS[entry.category] ?? 'gray'} variant="light" size="sm">
                    {CATEGORY_LABELS[entry.category] ?? entry.category}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDateTime(entry.startTime)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>{formatDuration(entry.durationMinutes)}</Text>
                </Table.Td>
                <Table.Td>
                  <VerificationBadge entry={entry} />
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    leftSection={<Check size={14} />}
                    loading={verifyingId === entry.id}
                    onClick={() => onVerify(entry)}
                  >
                    Verify
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}

export default function TimeTrackingPage({ currentUser }) {
  const currentStaffId = currentUser?.staffId ?? currentUser?.staffMemberId ?? null;
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [staffById, setStaffById] = useState({});
  const [assignedInternIds, setAssignedInternIds] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(currentStaffId ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);

  useEffect(() => {
    setSelectedUserId((previous) => previous || currentStaffId || '');
  }, [currentStaffId]);

  useEffect(() => {
    if (!currentStaffId) return undefined;

    let cancelled = false;

    async function loadSupervisorContext() {
      try {
        const [assignmentData, staffData] = await Promise.all([
          fetchJson(`/api/v1/supervisor-assignments?supervisorId=${encodeURIComponent(currentStaffId)}`),
          fetchJson('/api/v1/staff'),
        ]);
        if (cancelled) return;

        const nextStaffById = Object.fromEntries(
          (staffData.items ?? []).map((item) => [item.id, formatStaffName(item)]),
        );
        const nextAssignedInternIds = [...new Set(
          (assignmentData.items ?? []).map((item) => item.internId).filter(Boolean),
        )];

        setStaffById(nextStaffById);
        setAssignedInternIds(nextAssignedInternIds);
        setSelectedUserId((previous) => {
          if (previous && [currentStaffId, ...nextAssignedInternIds].includes(previous)) {
            return previous;
          }
          return currentStaffId;
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }

    loadSupervisorContext();
    return () => {
      cancelled = true;
    };
  }, [currentStaffId]);

  const loadData = useCallback(async () => {
    if (!currentStaffId) {
      setEntries([]);
      setSummary([]);
      setPendingEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const targetUserId = selectedUserId || currentStaffId;
      const entriesParams = new URLSearchParams();
      const summaryParams = new URLSearchParams();
      const pendingParams = new URLSearchParams();

      if (categoryFilter) entriesParams.set('category', categoryFilter);
      if (targetUserId && targetUserId !== currentStaffId) {
        entriesParams.set('userId', targetUserId);
        summaryParams.set('userId', targetUserId);
        pendingParams.set('userId', targetUserId);
      }

      const [entriesData, summaryData, pendingData] = await Promise.all([
        fetchJson(`/api/v1/time-entries?${entriesParams.toString()}`),
        fetchJson(`/api/v1/time-entries/summary?${summaryParams.toString()}`),
        assignedInternIds.length
          ? fetchJson(`/api/v1/time-entries/pending-verification?${pendingParams.toString()}`)
          : Promise.resolve({ items: [] }),
      ]);

      setEntries(entriesData.items ?? []);
      setSummary(summaryData.summary ?? []);
      setPendingEntries(pendingData.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignedInternIds, categoryFilter, currentStaffId, selectedUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isViewingOwnEntries = !selectedUserId || selectedUserId === currentStaffId;
  const selectedCounselorLabel = staffById[selectedUserId] ?? 'Assigned counselor';
  const viewOptions = [
    { value: currentStaffId ?? '', label: 'My entries' },
    ...assignedInternIds.map((internId) => ({
      value: internId,
      label: `${staffById[internId] ?? internId} (Assigned intern)`,
    })),
  ].filter((item) => item.value);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this time entry?')) return;
    try {
      const response = await fetch(`/api/v1/time-entries/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: csrfHeaders(),
      });
      if (!response.ok && response.status !== 204) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Delete failed');
      }
      await loadData();
      notifications.show({ title: 'Deleted', message: 'Time entry removed.', color: 'red' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleVerify = async (entry) => {
    setVerifyingId(entry.id);
    try {
      await fetchJson(`/api/v1/time-entries/${encodeURIComponent(entry.id)}/verify`, {
        method: 'POST',
        headers: csrfHeaders(),
      });
      await loadData();
      notifications.show({ title: 'Verified', message: 'Supervision entry verified and locked.', color: 'teal' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (!isViewingOwnEntries && selectedUserId) params.set('userId', selectedUserId);
    window.location.assign(`/api/v1/time-entries/export?${params.toString()}`);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={3}>Time Tracking</Title>
          <Text c="dimmed" size="sm">
            Track direct hours, indirect work, supervision verification, and licensure progress.
          </Text>
        </div>
        <Group gap="xs">
          <Button
            leftSection={<Download size={16} />}
            variant="default"
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => setLogOpen(true)}
            disabled={!isViewingOwnEntries}
          >
            Quick Log
          </Button>
        </Group>
      </Group>

      {!isViewingOwnEntries && (
        <Alert color="blue">
          Viewing {selectedCounselorLabel}'s ledger in read-only mode. Export and verification remain available.
        </Alert>
      )}

      <Group gap="sm" align="flex-end">
        {viewOptions.length > 1 && (
          <Select
            label="Ledger view"
            data={viewOptions}
            value={selectedUserId || currentStaffId || ''}
            onChange={(value) => setSelectedUserId(value ?? currentStaffId ?? '')}
            style={{ minWidth: 280 }}
          />
        )}
        <Select
          label="Filter by category"
          data={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(value) => setCategoryFilter(value ?? '')}
          style={{ minWidth: 240 }}
        />
      </Group>

      <LicensureProgressBars userId={selectedUserId || currentStaffId} />

      <SummaryCards summary={summary} />

      {error && <Alert color="red">{error}</Alert>}

      <PendingVerificationSection
        items={pendingEntries}
        staffById={staffById}
        verifyingId={verifyingId}
        onVerify={handleVerify}
      />

      {loading ? (
        <Group py="lg">
          <Loader size="sm" />
          <Text c="dimmed" size="sm">Loading time entries…</Text>
        </Group>
      ) : entries.length === 0 ? (
        <Text c="dimmed" size="sm">
          {isViewingOwnEntries
            ? 'No time entries found. Use Quick Log to add one.'
            : 'No time entries found for this counselor.'}
        </Text>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category</Table.Th>
                <Table.Th>Start</Table.Th>
                <Table.Th>End</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Status</Table.Th>
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
                    <Text size="sm" fw={600}>{formatDuration(entry.durationMinutes)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <VerificationBadge entry={entry} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={1}>{entry.description ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    {isViewingOwnEntries && !entry.isLocked && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        aria-label="Delete entry"
                      >
                        <Trash2 size={14} />
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
