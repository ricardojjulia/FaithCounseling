import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Button, Textarea, Badge,
  Loader, Alert, Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useI18n } from '../../../lib/i18nContext.jsx';
import { csrfHeaders } from '../../../lib/csrf.js';
import { frontendTelemetry } from '../../../lib/frontendTelemetry.js';

const TAG_OPTIONS = [
  { value: '',                  label: '— No tag —' },
  { value: 'Risk',              label: 'Risk' },
  { value: 'Family dynamics',   label: 'Family dynamics' },
  { value: 'Spiritual concerns', label: 'Spiritual concerns' },
  { value: 'Therapeutic progress', label: 'Therapeutic progress' },
  { value: 'Collateral contact', label: 'Collateral contact' },
];

const TAG_COLORS = {
  'Risk':                  'red',
  'Family dynamics':       'grape',
  'Spiritual concerns':    'violet',
  'Therapeutic progress':  'teal',
  'Collateral contact':    'orange',
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

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function InternalNoteCard({ note, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    summary: note.summary ?? '',
    tag: note.interventions ? (Array.isArray(note.interventions) ? note.interventions[0] : note.interventions.split('\n')[0]) : '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(note.id, {
        summary: draft.summary,
        interventions: draft.tag ? [draft.tag] : [],
      });
      setEditing(false);
      notifications.show({ title: 'Saved', message: 'Internal note updated.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const tag = Array.isArray(note.interventions)
    ? note.interventions[0]
    : (note.interventions ?? '').split('\n')[0];

  return (
    <Paper withBorder radius="md" p="md" style={{ borderLeft: '3px solid var(--mantine-color-grape-4)' }}>
      <Group justify="space-between" align="flex-start" mb="xs">
        <Group gap="xs">
          <Badge color="grape" variant="light" size="sm">Internal</Badge>
          {tag && <Badge color={TAG_COLORS[tag] ?? 'gray'} variant="dot" size="sm">{tag}</Badge>}
        </Group>
        <Text size="xs" c="dimmed">{formatDateTime(note.createdAt)}</Text>
      </Group>

      {editing ? (
        <Stack gap="sm">
          <Select
            label="Tag"
            data={TAG_OPTIONS}
            value={draft.tag}
            onChange={(val) => setDraft((d) => ({ ...d, tag: val ?? '' }))}
            size="xs"
          />
          <Textarea
            value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.currentTarget.value }))}
            minRows={3}
            autosize
          />
          <Group gap="xs">
            <Button size="xs" onClick={handleSave} loading={saving}>Save</Button>
            <Button size="xs" variant="default" onClick={() => setEditing(false)}>Cancel</Button>
          </Group>
        </Stack>
      ) : (
        <>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{note.summary}</Text>
          <Button size="xs" variant="subtle" mt="xs" onClick={() => setEditing(true)}>Edit</Button>
        </>
      )}
    </Paper>
  );
}

export default function InternalNotesTab({ clientId, currentUser }) {
  const { t } = useI18n();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState({ summary: '', tag: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes`);
      const internal = (data?.items ?? []).filter((n) => n.noteType === 'internal_note');
      setNotes(internal);
      frontendTelemetry.trackSurfaceLoad('chart.internal_notes', 'success');
    } catch (err) {
      setLoadError(err.message);
      frontendTelemetry.trackSurfaceLoad('chart.internal_notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!draft.summary.trim()) {
      notifications.show({ title: 'Required', message: 'Note content is required.', color: 'yellow' });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes`, {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({
          noteType: 'internal_note',
          summary: draft.summary.trim(),
          interventions: draft.tag ? [draft.tag] : [],
          locked: false,
        }),
      });
      setDraft({ summary: '', tag: '' });
      setComposerOpen(false);
      await load();
      notifications.show({ title: 'Saved', message: 'Internal note created.', color: 'green' });
      frontendTelemetry.trackAction('chart.internal_notes', 'create_note', 'success', { workflow: 'clinical_chart' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
      frontendTelemetry.trackAction('chart.internal_notes', 'create_note', 'failure', { workflow: 'clinical_chart' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (noteId, fields) => {
    await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes/${encodeURIComponent(noteId)}`, {
      method: 'PATCH',
      headers: csrfHeaders(),
      body: JSON.stringify(fields),
    });
    await load();
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={4}>{t('chart.tab.internalNotes')}</Title>
          <Text size="xs" c="dimmed" mt={2}>{t('chart.note.internalNotice')}</Text>
        </div>
        <Button size="sm" onClick={() => setComposerOpen((v) => !v)}>
          {composerOpen ? 'Cancel' : t('chart.note.newNote')}
        </Button>
      </Group>

      {composerOpen && (
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Select
              label="Tag"
              data={TAG_OPTIONS}
              value={draft.tag}
              onChange={(val) => setDraft((d) => ({ ...d, tag: val ?? '' }))}
            />
            <Textarea
              label="Note"
              placeholder="Private observations, clinical hunches, family dynamics notes, spiritual concerns…"
              value={draft.summary}
              onChange={(e) => setDraft((d) => ({ ...d, summary: e.currentTarget.value }))}
              minRows={4}
              autosize
              required
            />
            <Button onClick={handleCreate} loading={submitting}>Save Internal Note</Button>
          </Stack>
        </Paper>
      )}

      {loadError && <Alert color="red">{loadError}</Alert>}

      {loading ? (
        <Group py="lg"><Loader size="sm" /><Text c="dimmed" size="sm">Loading…</Text></Group>
      ) : notes.length === 0 ? (
        <Text c="dimmed" size="sm">{t('chart.note.noNotes')}</Text>
      ) : (
        <Stack gap="sm">
          {notes.map((note) => (
            <InternalNoteCard key={note.id} note={note} onUpdate={handleUpdate} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
