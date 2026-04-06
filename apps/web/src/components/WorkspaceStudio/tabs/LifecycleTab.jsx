import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button, Alert, Loader, Badge,
  Divider, SimpleGrid, Select, TextInput, Modal, Box, Progress,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../../../lib/csrf.js';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

const CASE_STATUS_META = {
  active:     { color: 'green',  label: 'Active',     order: 0 },
  waitlist:   { color: 'yellow', label: 'Waitlist',   order: 1 },
  inactive:   { color: 'gray',   label: 'Inactive',   order: 2 },
  discharged: { color: 'red',    label: 'Discharged', order: 3 },
};

const CASE_STATUS_OPTIONS = Object.entries(CASE_STATUS_META).map(([value, { label }]) => ({ value, label }));

const DISCHARGE_REASON_OPTIONS = [
  { value: 'treatment_complete', label: 'Treatment Complete' },
  { value: 'client_request', label: 'Client Request' },
  { value: 'moved_or_relocated', label: 'Moved / Relocated' },
  { value: 'referred_out', label: 'Referred Out' },
  { value: 'non_engagement', label: 'Non-Engagement' },
  { value: 'other', label: 'Other' },
];

function statusColor(s) { return CASE_STATUS_META[s]?.color ?? 'gray'; }
function statusLabel(s) { return CASE_STATUS_META[s]?.label ?? s; }

export default function LifecycleTab({ onOpenClient }) {
  const [clients, setClients] = useState([]);
  const [lifecycles, setLifecycles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitioningId, setTransitioningId] = useState(null);
  const [dischargeModal, setDischargeModal] = useState(null);
  const [dischargeDraft, setDischargeDraft] = useState({ reason: 'treatment_complete', notes: '' });
  const [dischargeSaving, setDischargeSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await apiFetch('/api/v1/clients?limit=500');
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setClients(items);
      const lcMap = {};
      items.forEach((c) => { if (c.lifecycle) lcMap[c.id] = c.lifecycle; });
      setLifecycles(lcMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(clientId, newStatus) {
    if (newStatus === 'discharged') {
      setDischargeModal(clientId);
      setDischargeDraft({ reason: 'treatment_complete', notes: '' });
      return;
    }
    setTransitioningId(clientId);
    try {
      await apiFetch(`/api/v1/clients/${clientId}/lifecycle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ caseStatus: newStatus }),
      });
      setLifecycles((prev) => ({ ...prev, [clientId]: { ...(prev[clientId] ?? {}), caseStatus: newStatus } }));
      notifications.show({ title: 'Status updated', message: `Client moved to ${statusLabel(newStatus)}.`, color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setTransitioningId(null);
    }
  }

  async function confirmDischarge() {
    if (!dischargeModal) return;
    setDischargeSaving(true);
    try {
      await apiFetch(`/api/v1/clients/${dischargeModal}/lifecycle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          caseStatus: 'discharged',
          dischargeRecord: { reason: dischargeDraft.reason, notes: dischargeDraft.notes, dischargedAt: new Date().toISOString() },
        }),
      });
      setLifecycles((prev) => ({ ...prev, [dischargeModal]: { ...(prev[dischargeModal] ?? {}), caseStatus: 'discharged' } }));
      notifications.show({ title: 'Client discharged', message: 'Discharge record saved.', color: 'teal' });
      setDischargeModal(null);
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDischargeSaving(false);
    }
  }

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load lifecycle data">{error}</Alert>;

  const withStatus = clients.map((c) => ({ ...c, caseStatus: lifecycles[c.id]?.caseStatus ?? 'active' }));
  const counts = Object.fromEntries(Object.keys(CASE_STATUS_META).map((s) => [s, withStatus.filter((c) => c.caseStatus === s).length]));
  const total = clients.length;

  const referralSources = {};
  clients.forEach((c) => {
    const src = lifecycles[c.id]?.referralSource?.trim() || 'Unspecified';
    referralSources[src] = (referralSources[src] ?? 0) + 1;
  });
  const sortedSources = Object.entries(referralSources).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const filtered = filterStatus === 'all' ? withStatus : withStatus.filter((c) => c.caseStatus === filterStatus);
  const dischargeClient = dischargeModal ? clients.find((c) => c.id === dischargeModal) : null;

  return (
    <Stack gap="md">
      {/* Status summary */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        {Object.entries(CASE_STATUS_META).sort((a, b) => a[1].order - b[1].order).map(([status, meta]) => (
          <Paper
            key={status}
            withBorder
            radius="md"
            p="md"
            style={{ cursor: 'pointer', opacity: filterStatus !== 'all' && filterStatus !== status ? 0.5 : 1 }}
            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
          >
            <Text fz="xs" c="dimmed" tt="uppercase" fw={700}>{meta.label}</Text>
            <Text fz="2rem" fw={700} c={meta.color}>{counts[status] ?? 0}</Text>
            {total > 0 && (
              <Progress value={((counts[status] ?? 0) / total) * 100} color={meta.color} size="xs" mt="xs" />
            )}
          </Paper>
        ))}
      </SimpleGrid>

      {/* Referral sources */}
      {sortedSources.length > 0 && (
        <Paper withBorder radius="md" p="md">
          <Title order={4} fz="sm" mb="sm">Referral Sources</Title>
          <Stack gap="xs">
            {sortedSources.map(([src, count]) => (
              <Group key={src} justify="space-between" wrap="nowrap">
                <Text fz="sm" truncate>{src}</Text>
                <Group gap="xs" wrap="nowrap">
                  <Progress value={total > 0 ? (count / total) * 100 : 0} size="sm" style={{ width: 80 }} color="blue" />
                  <Text fz="xs" c="dimmed" w={28} ta="right">{count}</Text>
                </Group>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Client caseload list */}
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="md">
          <Stack gap={2}>
            <Title order={3} fz="md">
              Caseload {filterStatus !== 'all' && `— ${statusLabel(filterStatus)}`}
            </Title>
            <Text fz="sm" c="dimmed">{filtered.length} client{filtered.length !== 1 ? 's' : ''}</Text>
          </Stack>
          <Group gap="xs">
            {filterStatus !== 'all' && (
              <Button size="xs" variant="subtle" onClick={() => setFilterStatus('all')}>Show all</Button>
            )}
            <Button size="xs" variant="default" onClick={load}>Refresh</Button>
          </Group>
        </Group>
        <Divider mb="md" />

        {!filtered.length ? (
          <Text c="dimmed" fz="sm">No clients in this status.</Text>
        ) : (
          <Stack gap="xs">
            {filtered.map((client) => {
              const lc = lifecycles[client.id] ?? {};
              const currentStatus = lc.caseStatus ?? 'active';
              const nextStatuses = CASE_STATUS_OPTIONS.filter((o) => o.value !== currentStatus);
              return (
                <Paper key={client.id} withBorder radius="sm" p="sm">
                  <Group justify="space-between" align="flex-start" wrap="wrap">
                    <Box>
                      <Group gap="xs" mb={2}>
                        <Text fz="sm" fw={600}>{client.firstName} {client.lastName}</Text>
                        <Badge size="xs" color={statusColor(currentStatus)} variant="light">
                          {statusLabel(currentStatus)}
                        </Badge>
                        {client.highTouchpoint && <Badge size="xs" color="grape" variant="dot">High touchpoint</Badge>}
                      </Group>
                      {lc.referralSource && (
                        <Text fz="xs" c="dimmed">Referral: {lc.referralSource}</Text>
                      )}
                      {currentStatus === 'discharged' && lc.dischargeRecord?.reason && (
                        <Text fz="xs" c="dimmed">
                          Discharge reason: {DISCHARGE_REASON_OPTIONS.find((o) => o.value === lc.dischargeRecord.reason)?.label ?? lc.dischargeRecord.reason}
                        </Text>
                      )}
                    </Box>
                    <Group gap="xs" wrap="nowrap">
                      {onOpenClient && (
                        <Button size="xs" variant="subtle" onClick={() => onOpenClient({ clientId: client.id })}>
                          View
                        </Button>
                      )}
                      <Select
                        size="xs"
                        placeholder="Move to…"
                        data={nextStatuses}
                        value={null}
                        onChange={(v) => v && setStatus(client.id, v)}
                        disabled={transitioningId === client.id}
                        style={{ width: 130 }}
                        comboboxProps={{ withinPortal: true }}
                      />
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Discharge modal */}
      <Modal
        opened={!!dischargeModal}
        onClose={() => setDischargeModal(null)}
        title={`Discharge — ${dischargeClient ? `${dischargeClient.firstName} ${dischargeClient.lastName}` : ''}`}
      >
        <Stack gap="sm">
          <Text fz="sm" c="dimmed">Record the reason for discharge. This is stored with the client lifecycle record.</Text>
          <Select
            label="Discharge Reason"
            data={DISCHARGE_REASON_OPTIONS}
            value={dischargeDraft.reason}
            onChange={(v) => setDischargeDraft((d) => ({ ...d, reason: v ?? 'treatment_complete' }))}
          />
          <TextInput
            label="Notes (optional)"
            value={dischargeDraft.notes}
            onChange={(e) => setDischargeDraft((d) => ({ ...d, notes: e.currentTarget.value }))}
            placeholder="Any additional context…"
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setDischargeModal(null)}>Cancel</Button>
            <Button color="red" loading={dischargeSaving} onClick={confirmDischarge}>Confirm Discharge</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
