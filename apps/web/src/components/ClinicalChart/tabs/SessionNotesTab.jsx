import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Paper, Group, Title, Text, Button, Textarea, Select, Badge,
  Loader, Alert, Divider, TextInput, Checkbox,
} from '@mantine/core';
import TemplatePicker from '../TemplatePicker.jsx';
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
  supervision:         'Supervision',
};

const SPIRITUAL_PRACTICE_OPTIONS = [
  { value: 'prayer_journaling',    label: 'Prayer / Journaling' },
  { value: 'scripture_reading',    label: 'Scripture Reading' },
  { value: 'church_attendance',    label: 'Church Attendance' },
  { value: 'small_group',          label: 'Small Group' },
  { value: 'spiritual_direction',  label: 'Spiritual Direction' },
  { value: 'fasting',              label: 'Fasting' },
  { value: 'sabbath_practice',     label: 'Sabbath Practice' },
];

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

function getTimelineState(appointment, linkedNotes) {
  if (appointment.status === 'cancelled') {
    return { label: 'Cancelled', color: 'red', detail: 'Session cancelled' };
  }
  if (appointment.status === 'scheduled') {
    return { label: 'Upcoming', color: 'blue', detail: 'Scheduled session ahead' };
  }
  if (linkedNotes.length === 0) {
    return { label: 'Note due', color: 'red', detail: 'No linked note yet' };
  }
  if (linkedNotes.some((note) => note.locked)) {
    return { label: 'Signed', color: 'teal', detail: 'Signed note on file' };
  }
  return { label: 'Draft open', color: 'yellow', detail: 'Draft note still open' };
}

function SessionTimeline({ appointments, notesByAppt }) {
  const timelineItems = [...appointments]
    .sort((left, right) => new Date(right.startsAt ?? right.scheduledAt ?? 0) - new Date(left.startsAt ?? left.scheduledAt ?? 0))
    .slice(0, 6);

  if (timelineItems.length === 0) return null;

  return (
    <Paper withBorder radius="xl" p="md" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,255,0.92))' }}>
      <Stack gap="sm">
        <div>
          <Text size="xs" tt="uppercase" fw={700} c="indigo" style={{ letterSpacing: '0.08em' }}>
            Session Timeline
          </Text>
          <Text c="dimmed" size="sm">
            Recent and upcoming sessions, with note completion state at a glance.
          </Text>
        </div>
        <Group wrap="nowrap" gap="sm" style={{ overflowX: 'auto', paddingBottom: 4 }}>
          {timelineItems.map((appointment) => {
            const state = getTimelineState(appointment, notesByAppt[appointment.id] ?? []);
            return (
              <Paper
                key={appointment.id}
                withBorder
                radius="lg"
                p="sm"
                style={{
                  minWidth: 190,
                  flex: '0 0 auto',
                  borderColor: `var(--mantine-color-${state.color}-3)`,
                  background: `var(--mantine-color-${state.color}-0)`,
                }}
              >
                <Stack gap={6}>
                  <Group justify="space-between" gap="xs" wrap="nowrap">
                    <Text fw={700} size="sm" lineClamp={1}>
                      {formatDate(appointment.startsAt ?? appointment.scheduledAt)}
                    </Text>
                    <Badge size="xs" color={state.color} variant="filled">
                      {state.label}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {APPT_TYPE_LABELS[appointment.appointmentType] ?? appointment.appointmentType ?? 'Session'}
                  </Text>
                  <Text size="xs" fw={600}>
                    {state.detail}
                  </Text>
                </Stack>
              </Paper>
            );
          })}
        </Group>
      </Stack>
    </Paper>
  );
}

function FaithFieldsView({ note }) {
  if (!note.scriptureReference && !(note.spiritualPractices?.length)) return null;
  return (
    <Stack gap={4} mt="xs">
      {note.scriptureReference && (
        <Text size="xs"><Text span fw={600}>Scripture: </Text>{note.scriptureReference}</Text>
      )}
      {note.spiritualPractices?.length > 0 && (
        <Text size="xs">
          <Text span fw={600}>Spiritual practices: </Text>
          {note.spiritualPractices
            .map((v) => SPIRITUAL_PRACTICE_OPTIONS.find((o) => o.value === v)?.label ?? v)
            .join(', ')}
        </Text>
      )}
    </Stack>
  );
}

function CosignBadge({ note }) {
  if (!note.cosignStatus) return null;
  const colors = { pending_review: 'orange', reviewed: 'teal', rejected: 'red' };
  const labels = { pending_review: 'Pending Cosign', reviewed: 'Cosigned', rejected: 'Returned' };
  return (
    <Badge color={colors[note.cosignStatus] ?? 'gray'} variant="light" size="xs">
      {labels[note.cosignStatus] ?? note.cosignStatus}
    </Badge>
  );
}

function NoteCard({ note, appointment, onSign, onUpdate, onSubmitForReview, onCosign, currentUser }) {
  const { t } = useI18n();
  const role = currentUser?.role;
  const [editing, setEditing] = useState(false);
  const [cosignModal, setCosignModal] = useState(false);
  const [cosignComments, setCosignComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [draft, setDraft] = useState({
    summary: note.summary ?? '',
    interventions: Array.isArray(note.interventions)
      ? note.interventions.join('\n')
      : (note.interventions ?? ''),
    scriptureReference: note.scriptureReference ?? '',
    spiritualPractices: note.spiritualPractices ?? [],
    templateId: note.templateId ?? null,
    templateSections: note.templateSections ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(note.id, {
        summary: draft.summary,
        interventions: draft.interventions.split('\n').map((s) => s.trim()).filter(Boolean),
        scriptureReference: draft.scriptureReference.trim() || null,
        spiritualPractices: draft.spiritualPractices.length ? draft.spiritualPractices : null,
        templateId: draft.templateId ?? null,
        templateSections: draft.templateSections ?? null,
      });
      setEditing(false);
      notifications.show({ title: 'Saved', message: 'Note updated.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    setActionLoading(true);
    try {
      await onSubmitForReview(note.id);
      notifications.show({ title: 'Submitted', message: 'Note submitted for supervisor review.', color: 'blue' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCosignAction = async (action) => {
    setActionLoading(true);
    try {
      await onCosign(note.id, action, cosignComments);
      setCosignModal(false);
      setCosignComments('');
      notifications.show({ title: action === 'reject' ? 'Returned' : 'Cosigned', message: action === 'reject' ? 'Note returned with comments.' : 'Note cosigned successfully.', color: action === 'reject' ? 'orange' : 'teal' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSign = async () => {
    // Crisis/safety template: require si_assessment and hi_assessment before locking
    if (draft.templateId && draft.templateSections) {
      const si = (draft.templateSections.si_assessment ?? '').trim();
      const hi = (draft.templateSections.hi_assessment ?? '').trim();
      // Only enforce if the note has these fields (i.e. it is the crisis-safety template)
      const hasCrisisFields = 'si_assessment' in (draft.templateSections ?? {}) || 'hi_assessment' in (draft.templateSections ?? {});
      if (hasCrisisFields && (!si || !hi)) {
        notifications.show({
          title: 'Cannot sign',
          message: 'Crisis & Safety notes require Suicidal Ideation and Homicidal Ideation assessments before signing.',
          color: 'red',
        });
        return;
      }
    }
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
          <CosignBadge note={note} />
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
          <FaithFieldsView note={note} />
          <Text size="xs" c="dimmed" mt="sm">
            {t('chart.note.signedOn')}: {formatDateTime(note.signedAt)}{note.signedBy ? ` · ${note.signedBy}` : ''}
          </Text>
          {note.cosignStatus === 'reviewed' && (
            <Text size="xs" c="teal" mt={4}>Cosigned by {note.cosignedBy ?? '—'} · {formatDateTime(note.cosignedAt)}</Text>
          )}
        </>
      ) : editing ? (
        <Stack gap="sm">
          <TemplatePicker
            value={draft.templateId}
            onChange={(id, tmpl) => {
              if (!id || !tmpl) {
                setDraft((d) => ({ ...d, templateId: null, templateSections: null }));
                return;
              }
              const sectionDefaults = Object.fromEntries(
                (tmpl.structure ?? []).map((f) => [f.key, ''])
              );
              const assembled = (tmpl.structure ?? [])
                .map((f) => `## ${f.label}\n`)
                .join('\n');
              setDraft((d) => ({
                ...d,
                templateId: id,
                templateSections: sectionDefaults,
                summary: assembled,
              }));
            }}
            hasExistingContent={Boolean(draft.summary.trim())}
          />
          {draft.templateSections
            ? (draft.templateId && Object.keys(draft.templateSections).length > 0
                ? Object.entries(draft.templateSections).map(([key, val]) => (
                    <Textarea
                      key={key}
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      value={val}
                      onChange={(e) => setDraft((d) => ({
                        ...d,
                        templateSections: { ...d.templateSections, [key]: e.currentTarget.value },
                        summary: Object.entries({ ...d.templateSections, [key]: e.currentTarget.value })
                          .map(([k, v]) => `## ${k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}\n${v}`)
                          .join('\n\n'),
                      }))}
                      minRows={3}
                      autosize
                    />
                  ))
                : null)
            : (
          <Textarea
            label={t('chart.note.summary')}
            placeholder={t('chart.note.summaryPlaceholder')}
            value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.currentTarget.value }))}
            minRows={4}
            autosize
          />
            )}
          <Textarea
            label={t('chart.note.interventions')}
            description="One per line"
            value={draft.interventions}
            onChange={(e) => setDraft((d) => ({ ...d, interventions: e.currentTarget.value }))}
            minRows={2}
            autosize
          />
          <TextInput
            label="Scripture Reference"
            placeholder="e.g. John 3:16"
            maxLength={255}
            value={draft.scriptureReference}
            onChange={(e) => setDraft((d) => ({ ...d, scriptureReference: e.currentTarget.value }))}
          />
          <div>
            <Text size="sm" fw={500} mb={4}>Spiritual Practices</Text>
            <Stack gap={4}>
              {SPIRITUAL_PRACTICE_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  checked={draft.spiritualPractices.includes(opt.value)}
                  onChange={(e) => setDraft((d) => ({
                    ...d,
                    spiritualPractices: e.currentTarget.checked
                      ? [...d.spiritualPractices, opt.value]
                      : d.spiritualPractices.filter((v) => v !== opt.value),
                  }))}
                />
              ))}
            </Stack>
          </div>
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
          <FaithFieldsView note={note} />
          {note.cosignStatus === 'rejected' && note.cosignComments && (
            <Alert color="orange" title="Returned by supervisor" mt="xs" radius="md">
              {note.cosignComments}
            </Alert>
          )}
          <Group gap="xs" mt="sm">
            <Button size="xs" variant="light" onClick={() => setEditing(true)}>Edit</Button>
            {role === 'intern' ? (
              note.cosignStatus === 'pending_review' ? (
                <Badge color="orange" variant="light" size="sm">Pending Supervisor Review</Badge>
              ) : (
                <Button size="xs" color="indigo" variant="filled" onClick={handleSubmitForReview} loading={actionLoading}>
                  Submit for Supervisor Review
                </Button>
              )
            ) : (
              <Button size="xs" color="teal" variant="filled" onClick={handleSign} loading={signing}>
                {t('chart.note.signAndLock')}
              </Button>
            )}
            {['counselor', 'practice_admin', 'practice_owner'].includes(role) && note.cosignStatus === 'pending_review' && (
              <>
                {!cosignModal ? (
                  <Button size="xs" color="teal" variant="outline" onClick={() => setCosignModal(true)}>
                    Cosign / Review
                  </Button>
                ) : (
                  <Paper withBorder radius="md" p="sm" mt="xs" style={{ width: '100%' }}>
                    <Stack gap="sm">
                      <Textarea
                        label="Comments (optional)"
                        value={cosignComments}
                        onChange={(e) => setCosignComments(e.currentTarget.value)}
                        minRows={2}
                        autosize
                      />
                      <Group gap="xs">
                        <Button size="xs" color="teal" loading={actionLoading} onClick={() => handleCosignAction('reviewed')}>Cosign</Button>
                        <Button size="xs" color="orange" variant="outline" loading={actionLoading} onClick={() => handleCosignAction('reject')}>Return</Button>
                        <Button size="xs" variant="default" onClick={() => setCosignModal(false)}>Cancel</Button>
                      </Group>
                    </Stack>
                  </Paper>
                )}
              </>
            )}
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
  // eslint-disable-next-line no-unused-vars
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
    scriptureReference: '',
    spiritualPractices: [],
    templateId: null,
    templateSections: null,
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
      scriptureReference: '',
      spiritualPractices: [],
      templateId: null,
      templateSections: null,
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
          scriptureReference: draft.scriptureReference.trim() || null,
          spiritualPractices: draft.spiritualPractices.length ? draft.spiritualPractices : null,
          templateId: draft.templateId ?? null,
          templateSections: draft.templateSections ?? null,
          locked: false,
        }),
      });
      setDraft({ appointmentId: '', noteType: 'progress_note', summary: '', interventions: '', scriptureReference: '', spiritualPractices: [], templateId: null, templateSections: null });
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

  const handleSubmitForReview = async (noteId) => {
    await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes/${encodeURIComponent(noteId)}/submit-for-review`, {
      method: 'POST',
      headers: csrfHeaders(),
      body: JSON.stringify({}),
    });
    await loadNotes();
  };

  const handleCosign = async (noteId, action, comments) => {
    await apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes/${encodeURIComponent(noteId)}/cosign`, {
      method: 'POST',
      headers: csrfHeaders(),
      body: JSON.stringify({ action, comments }),
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
      <SessionTimeline appointments={appointments} notesByAppt={notesByAppt} />

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
            <TemplatePicker
              value={draft.templateId}
              onChange={(id, tmpl) => {
                if (!id || !tmpl) {
                  setDraft((d) => ({ ...d, templateId: null, templateSections: null, summary: '' }));
                  return;
                }
                const sectionDefaults = Object.fromEntries(
                  (tmpl.structure ?? []).map((f) => [f.key, ''])
                );
                const assembled = (tmpl.structure ?? [])
                  .map((f) => `## ${f.label}\n`)
                  .join('\n');
                setDraft((d) => ({
                  ...d,
                  templateId: id,
                  templateSections: sectionDefaults,
                  summary: assembled,
                }));
              }}
              hasExistingContent={Boolean(draft.summary.trim())}
            />
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
            {draft.templateSections
              ? Object.entries(draft.templateSections).map(([key, val]) => (
                  <Textarea
                    key={key}
                    label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    value={val}
                    onChange={(e) => setDraft((d) => ({
                      ...d,
                      templateSections: { ...d.templateSections, [key]: e.currentTarget.value },
                      summary: Object.entries({ ...d.templateSections, [key]: e.currentTarget.value })
                        .map(([k, v]) => `## ${k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}\n${v}`)
                        .join('\n\n'),
                    }))}
                    minRows={3}
                    autosize
                    required={key === 'si_assessment' || key === 'hi_assessment' ? undefined : undefined}
                  />
                ))
              : (
              <Textarea
                label={t('chart.note.summary')}
                placeholder={t('chart.note.summaryPlaceholder')}
                value={draft.summary}
                onChange={(e) => setDraft((d) => ({ ...d, summary: e.currentTarget.value }))}
                minRows={5}
                autosize
                required
              />
              )}
            <Textarea
              label={t('chart.note.interventions')}
              description="One per line (e.g. CBT thought record, EMDR resourcing, prayer, Scripture reflection)"
              value={draft.interventions}
              onChange={(e) => setDraft((d) => ({ ...d, interventions: e.currentTarget.value }))}
              minRows={2}
              autosize
            />
            <TextInput
              label="Scripture Reference"
              placeholder="e.g. Philippians 4:6-7"
              maxLength={255}
              value={draft.scriptureReference}
              onChange={(e) => setDraft((d) => ({ ...d, scriptureReference: e.currentTarget.value }))}
            />
            <div>
              <Text size="sm" fw={500} mb={4}>Spiritual Practices</Text>
              <Stack gap={4}>
                {SPIRITUAL_PRACTICE_OPTIONS.map((opt) => (
                  <Checkbox
                    key={opt.value}
                    label={opt.label}
                    checked={draft.spiritualPractices.includes(opt.value)}
                    onChange={(e) => setDraft((d) => ({
                      ...d,
                      spiritualPractices: e.currentTarget.checked
                        ? [...d.spiritualPractices, opt.value]
                        : d.spiritualPractices.filter((v) => v !== opt.value),
                    }))}
                  />
                ))}
              </Stack>
            </div>
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
                    onSubmitForReview={handleSubmitForReview}
                    onCosign={handleCosign}
                    currentUser={currentUser}
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
                    onSubmitForReview={handleSubmitForReview}
                    onCosign={handleCosign}
                    currentUser={currentUser}
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
