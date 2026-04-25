import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Text, Group, Button, Badge,
  Divider, SimpleGrid, Select, TextInput, Modal, Box, Progress,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../../../lib/csrf.js';
import { SectionHeader, SectionSurface, SurfaceState, SurfaceStatCard } from '../../ui/surface.jsx';

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

  if (loading) return <SurfaceState type="loading" message="Loading lifecycle data..." />;
  if (error) return <SurfaceState type="error" title="Unable to load lifecycle data" message={error} />;

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
          <SurfaceStatCard
            key={status}
            label={meta.label}
            value={counts[status] ?? 0}
            color={meta.color}
            style={{ cursor: 'pointer', opacity: filterStatus !== 'all' && filterStatus !== status ? 0.5 : 1 }}
            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
          >
            {total > 0 && (
              <Progress value={((counts[status] ?? 0) / total) * 100} color={meta.color} size="xs" mt="xs" />
            )}
          </SurfaceStatCard>
        ))}
      </SimpleGrid>

      {/* Referral sources */}
      {sortedSources.length > 0 && (
        <SectionSurface>
          <SectionHeader title="Referral Sources" />
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
        </SectionSurface>
      )}

      {/* Client caseload list */}
      <SectionSurface>
        <SectionHeader
          title={`Caseload${filterStatus !== 'all' ? ` - ${statusLabel(filterStatus)}` : ''}`}
          description={`${filtered.length} client${filtered.length !== 1 ? 's' : ''}`}
          actions={(
            <>
              {filterStatus !== 'all' && (
                <Button size="xs" variant="subtle" onClick={() => setFilterStatus('all')}>Show all</Button>
              )}
              <Button size="xs" variant="default" onClick={load}>Refresh</Button>
            </>
          )}
        />
        <Divider mb="md" />

        {!filtered.length ? (
          <SurfaceState message="No clients in this status." />
        ) : (
          <Stack gap="xs">
            {filtered.map((client) => {
              const lc = lifecycles[client.id] ?? {};
              const currentStatus = lc.caseStatus ?? 'active';
              const nextStatuses = CASE_STATUS_OPTIONS.filter((o) => o.value !== currentStatus);
              return (
                <SectionSurface key={client.id} radius="sm" p="sm">
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
                </SectionSurface>
              );
            })}
          </Stack>
        )}
      </SectionSurface>

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
