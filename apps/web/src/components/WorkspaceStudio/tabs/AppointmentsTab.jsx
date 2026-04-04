import { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Paper, TextInput, Select, Group, Button, Alert, Loader,
  Badge, Divider, ActionIcon, Modal, NumberInput,
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

const CATEGORY_OPTIONS = [
  { value: 'therapy', label: 'Therapy' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'group', label: 'Group' },
  { value: 'crisis', label: 'Crisis' },
  { value: 'other', label: 'Other' },
];

const BLANK_FORM = { code: '', name: '', category: 'therapy', defaultDurationMinutes: 60 };

function ServiceCodeForm({ draft, onChange }) {
  return (
    <Stack gap="sm">
      <Group grow>
        <TextInput
          label="Code"
          value={draft.code}
          onChange={(e) => onChange('code', e.currentTarget.value.toUpperCase())}
          placeholder="e.g. 90837"
          required
          maxLength={30}
        />
        <Select
          label="Category"
          data={CATEGORY_OPTIONS}
          value={draft.category}
          onChange={(v) => onChange('category', v ?? 'therapy')}
        />
      </Group>
      <TextInput
        label="Service Name"
        value={draft.name}
        onChange={(e) => onChange('name', e.currentTarget.value)}
        placeholder="e.g. Individual Therapy Session (60 min)"
        required
        maxLength={160}
      />
      <NumberInput
        label="Default Duration (minutes)"
        value={draft.defaultDurationMinutes}
        onChange={(v) => onChange('defaultDurationMinutes', v ?? 60)}
        min={15}
        max={240}
        step={5}
        description="Used as the default when scheduling this service."
      />
    </Stack>
  );
}

const CATEGORY_COLOR = {
  therapy: 'blue',
  assessment: 'violet',
  consultation: 'teal',
  group: 'green',
  crisis: 'red',
  other: 'gray',
};

export default function AppointmentsTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState(BLANK_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');

  function load() {
    setLoading(true);
    apiFetch('/api/v1/billing/service-codes')
      .then((payload) => setCodes(Array.isArray(payload?.items) ? payload.items : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function addCode() {
    if (!addDraft.code.trim() || !addDraft.name.trim()) return;
    setAddSaving(true);
    try {
      const payload = await apiFetch('/api/v1/billing/service-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ ...addDraft, status: 'active' }),
      });
      setCodes((prev) => [...prev, payload.item]);
      setAddDraft(BLANK_FORM);
      setAddOpen(false);
      notifications.show({ title: 'Service code added', message: `${payload.item.code} is now available for scheduling.`, color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(sc) {
    setEditingId(sc.id);
    setEditDraft({ code: sc.code, name: sc.name, category: sc.category ?? 'therapy', defaultDurationMinutes: sc.defaultDurationMinutes ?? 60 });
  }

  async function saveEdit() {
    if (!editingId || !editDraft?.code?.trim() || !editDraft?.name?.trim()) return;
    setEditSaving(true);
    try {
      const payload = await apiFetch('/api/v1/billing/service-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ serviceCodeId: editingId, ...editDraft }),
      });
      setCodes((prev) => prev.map((c) => c.id === editingId ? payload.item : c));
      setEditingId(null);
      setEditDraft(null);
      notifications.show({ title: 'Saved', message: 'Service code updated.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleStatus(sc) {
    const newStatus = sc.status === 'active' ? 'inactive' : 'active';
    setTogglingId(sc.id);
    try {
      const payload = await apiFetch('/api/v1/billing/service-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ serviceCodeId: sc.id, status: newStatus }),
      });
      setCodes((prev) => prev.map((c) => c.id === sc.id ? payload.item : c));
      notifications.show({
        title: newStatus === 'active' ? 'Reactivated' : 'Deactivated',
        message: `${sc.code} is now ${newStatus}.`,
        color: newStatus === 'active' ? 'green' : 'gray',
      });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load service codes">{error}</Alert>;

  const filtered = filterStatus === 'all' ? codes : codes.filter((c) => c.status === filterStatus);
  const activeCnt = codes.filter((c) => c.status === 'active').length;
  const inactiveCnt = codes.filter((c) => c.status !== 'active').length;

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" align="flex-start" mb="md">
          <Stack gap={2}>
            <Title order={3} fz="md">Service Codes</Title>
            <Text fz="sm" c="dimmed">
              CPT / billing codes used when scheduling appointments and generating superbills.
            </Text>
          </Stack>
          <Group gap="xs">
            <Button size="xs" variant="default" onClick={load}>Refresh</Button>
            <Button size="xs" onClick={() => { setAddDraft(BLANK_FORM); setAddOpen(true); }}>+ Add Code</Button>
          </Group>
        </Group>
        <Divider mb="md" />

        {/* Status filter pills */}
        <Group gap="xs" mb="md">
          {[
            { value: 'active', label: `Active (${activeCnt})` },
            { value: 'inactive', label: `Inactive (${inactiveCnt})` },
            { value: 'all', label: `All (${codes.length})` },
          ].map(({ value, label }) => (
            <Badge
              key={value}
              variant={filterStatus === value ? 'filled' : 'outline'}
              color={value === 'active' ? 'green' : value === 'inactive' ? 'gray' : 'blue'}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilterStatus(value)}
            >
              {label}
            </Badge>
          ))}
        </Group>

        {!filtered.length ? (
          <Text c="dimmed" fz="sm">
            {filterStatus === 'active' ? 'No active service codes. Add one to enable scheduling.' : 'No service codes in this status.'}
          </Text>
        ) : (
          <Stack gap="sm">
            {filtered.map((sc) => (
              <Paper key={sc.id} withBorder radius="sm" p="sm" opacity={sc.status !== 'active' ? 0.65 : 1}>
                {editingId === sc.id ? (
                  <Stack gap="sm">
                    <ServiceCodeForm
                      draft={editDraft}
                      onChange={(f, v) => setEditDraft((d) => ({ ...d, [f]: v }))}
                    />
                    <Group justify="flex-end" gap="xs">
                      <Button size="xs" variant="default" onClick={() => { setEditingId(null); setEditDraft(null); }}>Cancel</Button>
                      <Button
                        size="xs"
                        loading={editSaving}
                        onClick={saveEdit}
                        disabled={!editDraft?.code?.trim() || !editDraft?.name?.trim()}
                      >
                        Save
                      </Button>
                    </Group>
                  </Stack>
                ) : (
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Group gap="xs" wrap="nowrap">
                        <Text fz="sm" fw={700}>{sc.code}</Text>
                        <Badge size="xs" color={CATEGORY_COLOR[sc.category] ?? 'gray'} variant="light">
                          {CATEGORY_OPTIONS.find((o) => o.value === sc.category)?.label ?? sc.category}
                        </Badge>
                        {sc.status !== 'active' && (
                          <Badge size="xs" color="gray" variant="outline">Inactive</Badge>
                        )}
                      </Group>
                      <Text fz="sm" truncate>{sc.name}</Text>
                      <Text fz="xs" c="dimmed">{sc.defaultDurationMinutes ?? 60} min default</Text>
                    </Stack>
                    <Group gap="xs" wrap="nowrap">
                      <Button size="xs" variant="subtle" onClick={() => startEdit(sc)}>Edit</Button>
                      <ActionIcon
                        size="sm"
                        color={sc.status === 'active' ? 'gray' : 'green'}
                        variant="subtle"
                        loading={togglingId === sc.id}
                        onClick={() => toggleStatus(sc)}
                        title={sc.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      >
                        {sc.status === 'active' ? '⏸' : '▶'}
                      </ActionIcon>
                    </Group>
                  </Group>
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Modal opened={addOpen} onClose={() => setAddOpen(false)} title="Add Service Code">
        <Stack gap="sm">
          <ServiceCodeForm draft={addDraft} onChange={(f, v) => setAddDraft((d) => ({ ...d, [f]: v }))} />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              loading={addSaving}
              onClick={addCode}
              disabled={!addDraft.code.trim() || !addDraft.name.trim()}
            >
              Add Code
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
