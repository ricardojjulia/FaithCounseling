import { useState, useEffect } from 'react';
import {
  Stack, Text, TextInput, Group, Button,
  Badge, Switch, ActionIcon, Divider, Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Plus, X } from 'lucide-react';
import { csrfHeaders } from '../../../lib/csrf.js';
import { SectionHeader, SectionSurface, SurfaceState } from '../../ui/surface.jsx';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

const BLANK_FORM = { name: '', address: '', capacity: 1, remoteEnabled: false };

function LocationForm({ draft, onChange }) {
  return (
    <Stack gap="sm">
      <TextInput
        label="Location Name"
        value={draft.name}
        onChange={(e) => onChange('name', e.currentTarget.value)}
        required
      />
      <TextInput
        label="Address"
        value={draft.address}
        onChange={(e) => onChange('address', e.currentTarget.value)}
        placeholder="123 Main St, City, State"
      />
      <Group grow>
        <TextInput
          label="Capacity"
          type="number"
          min={1}
          max={1000}
          value={String(draft.capacity)}
          onChange={(e) => onChange('capacity', Number(e.currentTarget.value) || 1)}
          description="Max concurrent sessions at this location."
        />
        <Stack gap={4} justify="flex-end" pb={4}>
          <Text fz="sm" fw={500}>Telehealth / Remote</Text>
          <Switch
            checked={draft.remoteEnabled}
            onChange={(e) => onChange('remoteEnabled', e.currentTarget.checked)}
            label={draft.remoteEnabled ? 'Remote-enabled' : 'In-person only'}
          />
        </Stack>
      </Group>
    </Stack>
  );
}

export default function LocationsTab() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState(BLANK_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  function load() {
    setLoading(true);
    apiFetch('/api/v1/locations')
      .then((payload) => setLocations(Array.isArray(payload?.items) ? payload.items : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function addLocation() {
    if (!addDraft.name.trim()) return;
    setAddSaving(true);
    try {
      const payload = await apiFetch('/api/v1/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(addDraft),
      });
      setLocations((prev) => [...prev, payload.item]);
      setAddDraft(BLANK_FORM);
      setAddOpen(false);
      notifications.show({ title: 'Location added', message: `${payload.item.name} is now available for scheduling.`, color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(loc) {
    setEditingId(loc.id);
    setEditDraft({ name: loc.name, address: loc.address ?? '', capacity: loc.capacity ?? 1, remoteEnabled: Boolean(loc.remoteEnabled) });
  }

  async function saveEdit() {
    if (!editingId || !editDraft?.name?.trim()) return;
    setEditSaving(true);
    try {
      const payload = await apiFetch(`/api/v1/locations/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(editDraft),
      });
      setLocations((prev) => prev.map((l) => l.id === editingId ? payload.item : l));
      setEditingId(null);
      setEditDraft(null);
      notifications.show({ title: 'Saved', message: 'Location updated.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteLocation(id, name) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/v1/locations/${id}`, {
        method: 'DELETE',
        headers: csrfHeaders(),
      });
      setLocations((prev) => prev.filter((l) => l.id !== id));
      notifications.show({ title: 'Removed', message: `${name} has been removed.`, color: 'teal' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <SurfaceState type="loading" message="Loading locations..." />;
  if (error) return <SurfaceState type="error" title="Unable to load locations" message={error} />;

  return (
    <Stack gap="md">
      <SectionSurface>
        <SectionHeader
          title="Locations"
          description="Practice locations used for scheduling and client appointments."
          actions={(
            <Button
              size="xs"
              leftSection={<Plus size={14} />}
              onClick={() => { setAddDraft(BLANK_FORM); setAddOpen(true); }}
            >
              Add Location
            </Button>
          )}
        />
        <Divider mb="md" />

        {!locations.length ? (
          <SurfaceState message="No locations configured. Add one to enable location-based scheduling." />
        ) : (
          <Stack gap="sm">
            {locations.map((loc) => (
              <SectionSurface key={loc.id} radius="sm" p="sm">
                {editingId === loc.id ? (
                  <Stack gap="sm">
                    <LocationForm draft={editDraft} onChange={(f, v) => setEditDraft((d) => ({ ...d, [f]: v }))} />
                    <Group justify="flex-end" gap="xs">
                      <Button size="xs" variant="default" onClick={() => { setEditingId(null); setEditDraft(null); }}>Cancel</Button>
                      <Button size="xs" loading={editSaving} onClick={saveEdit} disabled={!editDraft?.name?.trim()}>Save</Button>
                    </Group>
                  </Stack>
                ) : (
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text fz="sm" fw={600}>{loc.name}</Text>
                        {loc.remoteEnabled && <Badge size="xs" color="blue" variant="light">Telehealth</Badge>}
                      </Group>
                      {loc.address && <Text fz="xs" c="dimmed">{loc.address}</Text>}
                      <Text fz="xs" c="dimmed">Capacity: {loc.capacity ?? 1}</Text>
                    </Stack>
                    <Group gap="xs" wrap="nowrap">
                      <Button size="xs" variant="subtle" onClick={() => startEdit(loc)}>Edit</Button>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="subtle"
                        loading={deletingId === loc.id}
                        onClick={() => deleteLocation(loc.id, loc.name)}
                        title="Remove location"
                      >
                        <X size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                )}
              </SectionSurface>
            ))}
          </Stack>
        )}
      </SectionSurface>

      <Modal opened={addOpen} onClose={() => setAddOpen(false)} title="Add Location">
        <Stack gap="sm">
          <LocationForm draft={addDraft} onChange={(f, v) => setAddDraft((d) => ({ ...d, [f]: v }))} />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button loading={addSaving} onClick={addLocation} disabled={!addDraft.name.trim()}>Add Location</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
