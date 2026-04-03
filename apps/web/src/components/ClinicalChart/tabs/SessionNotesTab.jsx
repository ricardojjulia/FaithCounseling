import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Button, Textarea, Select, Badge,
  Loader, Alert, Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useI18n } from '../../../lib/i18nContext.jsx';
import { csrfHeaders } from '../../../lib/csrf.js';
import { frontendTelemetry } from '../../../lib/frontendTelemetry.js';

const NOTE_TYPE_OPTIONS = [
  { value: 'intake_note',           label: 'Intake Note' },
  { value: 'progress_note',         label: 'Progress Note' },
  { value: 'treatment_plan_review', label: 'Treatment Plan Review' },
  { value: 'discharge_note',        label: 'Discharge Note' },
];

const APPT_TYPE_LABELS = {
  intake_assessment:   'Intake Assessment',
  individual_therapy:  'Individual Therapy',
  couples_therapy:     'Couples Therapy',
  family_therapy:      'Family Therapy',
  group_therapy:       'Group Therapy',
};

const NOTE_TYPE_COLORS = {
  intake_note:           'violet',
  progress_note:         'blue',
  treatment_plan_review: 'teal',
  discharge_note:        'orange',
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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function apptLabel(appt) {
  const type = APPT_TYPE_LABELS[appt.appointmentType] ?? appt.appointmentType ?? 'Session';
  const date = formatDate(appt.startsAt ?? appt.scheduledAt);
  const status = appt.status !== 'scheduled' ? ` · ${appt.status}` : '';
  return `${date} — ${type}${status}`;
}

function NoteTypeBadge({ noteType }) {
  const labels = {
    intake_note: 'Intake', progress_note: 'Progress',
    treatment_plan_review: 'Plan Review', discharge_note: 'Discharge',
  };
  return (
    <Badge color={NOTE_TYPE_COLORS[noteType] ?? 'gray'} variant="light" size="sm">
      {labels[noteType] ?? noteType}
    </Badge>
  );
}

function NoteCard({ note, appointment, onSign, onUpdate }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    summary: note.summary ?? '',
    interventions: Array.isArray(note.interventions)
      ? note.interventions.join('\n')
      : (note.interventions ?? ''),
  });
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(note.id, {
        summary: draft.summary,
        interventions: draft.interventions.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      setEditing(false);
      notifications.show({ title: 'Saved', message: 'Note updated.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!window.confirm(t('chart.note.confirmSign'))) return;
    setSigning(true);
    try {
      await onSign(note.id);
      notifications.show({ title: 'Signed', message: 'Note signed and locked.', color: 'teal' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSigning(false);
    }
  };

  const interventionLines = Array.isArray(note.interventions)
    ? note.interventions
    : (note.interventions ?? '').split('\n').filter(Boolean);

  const borderColor = note.locked
    ? 'var(--mantine-color-teal-5)'
    : 'var(--mantine-color-blue-4)';

  return (
    <Paper withBorder radius="md" p="md" style={{ borderLeft: `3px solid ${borderColor}` }}>
      <Group justify="space-between" align="flex-start" mb={4}>
        <Group gap="xs">
          <NoteTypeBadge noteType={note.noteType} />
          {note.locked
            ? <Badge color="teal" variant="filled" size="xs">{t('chart.note.locked')}</Badge>
            : <Badge color="yellow" variant="light" size="xs">{t('chart.note.draft')}</Badge>}
        </Group>
        <Text size="xs" c="dimmed">{formatDateTime(note.createdAt)}</Text>
      </Group>

      {/* Session linkage line */}
      {appointment && (
        <Text size="xs" c="dimmed" mb="xs">
          {APPT_TYPE_LABELS[appointment.appointmentType] ?? appointment.appointmentType} · {formatDate(appointment.startsAt ?? appointment.scheduledAt)}
          {appointment.counselorName ? ` · ${appointment.counselorName}` : ''}
          {appointment.locationName ? ` · ${appointment.locationName}` : ''}
        </Text>
      )}

      {note.locked ? (
        <>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{note.summary}</Text>
          {interventionLines.length > 0 && (
            <>
              <Text size="xs" fw={600} mt="sm" mb={4} c="dimmed" tt="uppercase">{t('chart.note.interventions')}</Text>
              <Stack gap={2}>
                {interventionLines.map((line, i) => <Text key={i} size="sm">• {line}</Text>)}
              </Stack>
            </>
          )}
          <Text size="xs" c="dimmed" mt="sm">
            {t('chart.note.signedOn')}: {formatDateTime(note.signedAt)}{note.signedBy ? ` · ${note.signedBy}` : ''}
          </Text>
        </>
      ) : editing ? (
        <Stack gap="sm">
          <Textarea
            label={t('chart.note.summary')}
            placeholder={t('chart.note.summaryPlaceholder')}
            value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.currentTarget.value }))}
            minRows={4}
            autosize
          />
          <Textarea
            label={t('chart.note.interventions')}
            description="One per line"
            value={draft.interventions}
            onChange={(e) => setDraft((d) => ({ ...d, interventions: e.currentTarget.value }))}
            minRows={2}
            autosize
          />
          <Group gap="xs">
            <Button size="xs" onClick={handleSave} loading={saving}>{t('chart.note.saveAsDraft')}</Button>
            <Button size="xs" variant="default" onClick={() => setEditing(false)}>Cancel</Button>
          </Group>
        </Stack>
      ) : (
        <>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{note.summary}</Text>
          {interventionLines.length > 0 && (
            <>
              <Text size="xs" fw={600} mt="sm" mb={4} c="dimmed" tt="uppercase">{t('chart.note.interventions')}</Text>
              <Stack gap={2}>
                {interventionLines.map((line, i) => <Text key={i} size="sm">• {line}</Text>)}
              </Stack>
            </>
          )}
          <Group gap="xs" mt="sm">
            <Button size="xs" variant="light" onClick={() => setEditing(true)}>Edit</Button>
            <Button size="xs" color="teal" variant="filled" onClick={handleSign} loading={signing}>
              {t('chart.note.signAndLock')}
            </Button>
          </Group>
        </>
      )}
    </Paper>
  );
}

export default function SessionNotesTab({
  clientId,
  currentUser,
  initialComposerOpen = false,
  initialAppointmentAt = '',
  handoffKey = 0,
}) {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [apptLoadError, setApptLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState({
    appointmentId: '',
    noteType: 'progress_note',
    summary: '',
    interventions: '',
  });

  const loadAppointments = useCallback(async () => {
    if (!clientId) return;
    setLoadingAppts(true);
    setApptLoadError(null);
    try {
      const data = await apiFetch(`/api/v1/appointments?clientId=${encodeURIComponent(clientId)}`);
      const clientAppts = (data?.items ?? [])
        .sort((a, b) => new Date(b.startsAt ?? b.scheduledAt ?? 0) - new Date(a.startsAt ?? a.scheduledAt ?? 0));
      setAppointments(clientAppts);
    } catch (err) {
      setApptLoadError(err.message);
      console.error('[SessionNotesTab] Failed to load appointments:', err.message);
    } finally {
      setLoadingAppts(false);
    }
  }, [clientId]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes`);
      const clinical = (data?.items ?? []).filter((n) => n.noteType !== 'internal_note');
      setNotes(clinical);
      frontendTelemetry.trackSurfaceLoad('chart.session_notes', 'success');
    } catch (err) {
      setLoadError(err.message);
      frontendTelemetry.trackSurfaceLoad('chart.session_notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadAppointments();
    loadNotes();
  }, [loadAppointments, loadNotes]);

  useEffect(() => {
    setComposerOpen(false);
    setDraft({
      appointmentId: '',
      noteType: 'progress_note',
      summary: '',
      interventions: '',
    });
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !initialComposerOpen) return;

    const matchingAppointmentId = initialAppointmentAt
      ? (appointments.find((appointment) => (
          (appointment.startsAt ?? appointment.scheduledAt ?? '') === initialAppointmentAt
        ))?.id ?? '')
      : '';

    setDraft((currentDraft) => ({
      ...currentDraft,
      appointmentId: matchingAppointmentId,
      noteType: 'progress_note',
    }));
    setComposerOpen(true);
  }, [appointments, clientId, handoffKey, initialAppointmentAt, initialComposerOpen]);

  const apptOptions = appointments.map((a) => ({
    value: a.id,
    label: apptLabel(a),
  }));

  const handleCreate = async () => {
    if (!draft.appointmentId) {
      notifications.show({ title: 'Session required', message: 'Select a calendar session to attach this note to.', color: 'yellow' });
      return;
    }
    if (!draft.summary.trim()) {
      notifications.show({ title: 'Required', message: 'Session summary is required.', color: 'yellow' });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes`, {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({
          appointmentId: draft.appointmentId,
          noteType: draft.noteType,
          summary: draft.summary.trim(),
          interventions: draft.interventions.split('\n').map((s) => s.trim()).filter(Boolean),
          locked: false,
        }),
      });
      setDraft({ appointmentId: '', noteType: 'progress_note', summary: '', interventions: '' });
      setComposerOpen(false);
      await loadNotes();
      notifications.show({ title: 'Saved', message: 'Draft note created.', color: 'green' });
      frontendTelemetry.trackAction('chart.session_notes', 'create_note', 'success', { workflow: 'clinical_chart' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
      frontendTelemetry.trackAction('chart.session_notes', 'create_note', 'failure', { workflow: 'clinical_chart' });
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
    await loadNotes();
  };

  const handleSign = async (noteId) => {
    await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes/${encodeURIComponent(noteId)}`, {
      method: 'PATCH',
      headers: csrfHeaders(),
      body: JSON.stringify({
        locked: true,
        signedBy: currentUser
          ? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() || currentUser.email
          : undefined,
      }),
    });
    await loadNotes();
  };

  // Map appointmentId → appointment object for display on each note
  const apptMap = Object.fromEntries(appointments.map((a) => [a.id, a]));

  // Group notes by appointment
  const notesByAppt = {};
  const unlinkedNotes = [];
  for (const note of notes) {
    if (note.appointmentId && apptMap[note.appointmentId]) {
      if (!notesByAppt[note.appointmentId]) notesByAppt[note.appointmentId] = [];
      notesByAppt[note.appointmentId].push(note);
    } else {
      unlinkedNotes.push(note);
    }
  }

  // Sort appointments newest first for display
  const apptIdsWithNotes = appointments
    .filter((a) => notesByAppt[a.id]?.length > 0)
    .sort((a, b) => new Date(b.startsAt ?? b.scheduledAt ?? 0) - new Date(a.startsAt ?? a.scheduledAt ?? 0));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>{t('chart.tab.sessionNotes')}</Title>
        <Button size="sm" onClick={() => setComposerOpen((v) => !v)}>
          {composerOpen ? 'Cancel' : t('chart.note.newNote')}
        </Button>
      </Group>

      {composerOpen && (
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            {apptLoadError && (
              <Alert color="red" title="Could not load sessions">
                {apptLoadError}
              </Alert>
            )}
            <Select
              label="Session (required)"
              description="Notes must be attached to a scheduled calendar session"
              placeholder={loadingAppts ? 'Loading sessions…' : appointments.length === 0 ? 'No sessions on calendar for this client' : 'Select session from calendar…'}
              data={apptOptions}
              value={draft.appointmentId}
              onChange={(val) => setDraft((d) => ({ ...d, appointmentId: val ?? '' }))}
              searchable
              required
              disabled={loadingAppts || appointments.length === 0}
            />
            <Select
              label="Note Type"
              data={NOTE_TYPE_OPTIONS}
              value={draft.noteType}
              onChange={(val) => setDraft((d) => ({ ...d, noteType: val ?? 'progress_note' }))}
            />
            <Textarea
              label={t('chart.note.summary')}
              placeholder={t('chart.note.summaryPlaceholder')}
              value={draft.summary}
              onChange={(e) => setDraft((d) => ({ ...d, summary: e.currentTarget.value }))}
              minRows={5}
              autosize
              required
            />
            <Textarea
              label={t('chart.note.interventions')}
              description="One per line (e.g. CBT thought record, EMDR resourcing, prayer, Scripture reflection)"
              value={draft.interventions}
              onChange={(e) => setDraft((d) => ({ ...d, interventions: e.currentTarget.value }))}
              minRows={2}
              autosize
            />
            <Button onClick={handleCreate} loading={submitting} disabled={!draft.appointmentId}>
              {t('chart.note.saveAsDraft')}
            </Button>
          </Stack>
        </Paper>
      )}

      {loadError && <Alert color="red">{loadError}</Alert>}

      {loading ? (
        <Group py="lg"><Loader size="sm" /><Text c="dimmed" size="sm">Loading notes…</Text></Group>
      ) : notes.length === 0 ? (
        <Text c="dimmed" size="sm">{t('chart.note.noNotes')}</Text>
      ) : (
        <Stack gap="xl">
          {/* Notes grouped under their appointment */}
          {apptIdsWithNotes.map((appt) => (
            <div key={appt.id}>
              <Group gap="xs" mb="sm">
                <Text fw={600} size="sm">{apptLabel(appt)}</Text>
                <Badge
                  color={appt.status === 'completed' ? 'teal' : appt.status === 'cancelled' ? 'red' : 'blue'}
                  variant="light" size="xs"
                >
                  {appt.status}
                </Badge>
              </Group>
              <Stack gap="sm">
                {notesByAppt[appt.id].map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    appointment={appt}
                    onSign={handleSign}
                    onUpdate={handleUpdate}
                  />
                ))}
              </Stack>
            </div>
          ))}

          {/* Unlinked legacy notes */}
          {unlinkedNotes.length > 0 && (
            <>
              {apptIdsWithNotes.length > 0 && <Divider label="Older notes (no session linked)" labelPosition="left" />}
              <Stack gap="sm">
                {unlinkedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    appointment={null}
                    onSign={handleSign}
                    onUpdate={handleUpdate}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      )}
    </Stack>
  );
}
