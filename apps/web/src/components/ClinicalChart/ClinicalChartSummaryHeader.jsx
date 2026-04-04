import { useEffect, useMemo, useState } from 'react';
import {
  Badge, Group, Paper, Progress, SimpleGrid, Skeleton, Stack, Text, ThemeIcon,
} from '@mantine/core';

async function apiFetch(url) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body.error || body.message || message;
    } catch (_) {
      // ignore response parsing issues for summary loading
    }
    throw new Error(message);
  }
  return response.json();
}

function formatDate(iso) {
  if (!iso) return 'Not recorded';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return 'Not scheduled';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getAssessmentTone(submission) {
  const source = `${submission?.interpretationLabel ?? ''} ${submission?.scoreLabel ?? ''}`.toLowerCase();
  if (source.includes('severe') || source.includes('probable') || source.includes('dependent')) {
    return { color: 'red', label: 'High concern' };
  }
  if (source.includes('moderate') || source.includes('harmful') || source.includes('hazardous')) {
    return { color: 'yellow', label: 'Moderate concern' };
  }
  if (source.includes('mild') || source.includes('subthreshold')) {
    return { color: 'lime', label: 'Watch' };
  }
  return { color: 'blue', label: 'Baseline' };
}

function deriveNoteState(appointments, notes) {
  const noteByAppointmentId = new Map();
  for (const note of notes) {
    if (!note?.appointmentId) continue;
    if (!noteByAppointmentId.has(note.appointmentId)) {
      noteByAppointmentId.set(note.appointmentId, []);
    }
    noteByAppointmentId.get(note.appointmentId).push(note);
  }

  const latestCompleted = [...appointments]
    .filter((item) => item.status === 'completed' || item.status === 'checked_in')
    .sort((left, right) => new Date(right.startsAt ?? right.scheduledAt ?? 0) - new Date(left.startsAt ?? left.scheduledAt ?? 0))[0];

  const linkedNotes = latestCompleted ? (noteByAppointmentId.get(latestCompleted.id) ?? []) : [];
  const signedNotes = notes.filter((note) => note.locked).length;
  const draftNotes = notes.filter((note) => !note.locked).length;

  if (!latestCompleted) {
    return {
      label: 'No completed session',
      color: 'gray',
      detail: 'Session note status starts once a session is checked in or completed.',
      completionPct: 0,
      draftNotes,
      signedNotes,
    };
  }

  if (linkedNotes.length === 0) {
    return {
      label: 'Note due',
      color: 'red',
      detail: `Latest completed session on ${formatDateTime(latestCompleted.startsAt ?? latestCompleted.scheduledAt)} does not have a linked note yet.`,
      completionPct: 20,
      draftNotes,
      signedNotes,
    };
  }

  const signedLinked = linkedNotes.some((note) => note.locked);
  if (signedLinked) {
    return {
      label: 'Signed',
      color: 'teal',
      detail: `Latest completed session from ${formatDateTime(latestCompleted.startsAt ?? latestCompleted.scheduledAt)} has a locked note on file.`,
      completionPct: 100,
      draftNotes,
      signedNotes,
    };
  }

  return {
    label: 'Draft open',
    color: 'yellow',
    detail: `Latest completed session from ${formatDateTime(latestCompleted.startsAt ?? latestCompleted.scheduledAt)} has a draft note that still needs signature.`,
    completionPct: 60,
    draftNotes,
    signedNotes,
  };
}

function SummaryCard({ title, eyebrow, badge, children, accent }) {
  return (
    <Paper
      withBorder
      radius="xl"
      p="lg"
      style={{
        minHeight: 180,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,255,0.92))',
        borderColor: 'rgba(79,70,229,0.12)',
        boxShadow: '0 18px 40px rgba(34, 51, 93, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '0 auto auto 0',
          width: '100%',
          height: 4,
          background: accent,
        }}
      />
      <Group justify="space-between" align="flex-start" mb="md">
        <Stack gap={2}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.08em' }}>
            {eyebrow}
          </Text>
          <Text fw={700} size="sm">{title}</Text>
        </Stack>
        {badge}
      </Group>
      {children}
    </Paper>
  );
}

export default function ClinicalChartSummaryHeader({ clientId, client }) {
  const [summary, setSummary] = useState({
    loading: false,
    error: null,
    appointments: [],
    notes: [],
    plan: null,
    submissions: [],
  });

  useEffect(() => {
    if (!clientId) {
      setSummary({ loading: false, error: null, appointments: [], notes: [], plan: null, submissions: [] });
      return;
    }

    let cancelled = false;
    setSummary((current) => ({ ...current, loading: true, error: null }));

    Promise.all([
      apiFetch(`/api/v1/appointments?clientId=${encodeURIComponent(clientId)}`),
      apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes`),
      apiFetch(`/api/v1/clients/${encodeURIComponent(clientId)}/treatment-plan`),
      apiFetch(`/api/v1/forms/submissions?clientId=${encodeURIComponent(clientId)}`),
    ])
      .then(([appointmentsPayload, notesPayload, planPayload, submissionsPayload]) => {
        if (cancelled) return;
        setSummary({
          loading: false,
          error: null,
          appointments: Array.isArray(appointmentsPayload?.items) ? appointmentsPayload.items : [],
          notes: Array.isArray(notesPayload?.items) ? notesPayload.items.filter((note) => note.noteType !== 'internal_note') : [],
          plan: planPayload?.item ?? null,
          submissions: Array.isArray(submissionsPayload?.items) ? submissionsPayload.items : [],
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setSummary({
          loading: false,
          error: error.message || 'Unable to load chart summary',
          appointments: [],
          notes: [],
          plan: null,
          submissions: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const derived = useMemo(() => {
    const appointments = [...summary.appointments].sort((left, right) => new Date(left.startsAt ?? left.scheduledAt ?? 0) - new Date(right.startsAt ?? right.scheduledAt ?? 0));
    const completedAppointments = appointments.filter((item) => item.status === 'completed' || item.status === 'checked_in');
    const lastSession = completedAppointments[completedAppointments.length - 1] ?? null;
    const nextSession = appointments.find((item) => new Date(item.startsAt ?? item.scheduledAt ?? 0).getTime() > Date.now()) ?? null;
    const noteState = deriveNoteState(summary.appointments, summary.notes);
    const scoredSubmissions = summary.submissions
      .filter((submission) => submission.scoreValue != null)
      .sort((left, right) => new Date(right.submittedAt ?? 0) - new Date(left.submittedAt ?? 0));
    const latestAssessment = scoredSubmissions[0] ?? null;
    const assessmentTone = getAssessmentTone(latestAssessment);
    const goals = Array.isArray(summary.plan?.goals) ? summary.plan.goals.filter(Boolean) : [];
    const interventions = Array.isArray(summary.plan?.interventions) ? summary.plan.interventions.filter(Boolean) : [];

    return {
      lastSession,
      nextSession,
      noteState,
      latestAssessment,
      assessmentTone,
      goals,
      interventions,
    };
  }, [summary.appointments, summary.notes, summary.plan, summary.submissions]);

  if (!clientId) return null;

  return (
    <Stack gap="md">
      <Paper
        radius="xl"
        p="xl"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(129,140,248,0.18), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.97), rgba(240,244,255,0.94))',
          border: '1px solid rgba(79,70,229,0.12)',
          boxShadow: '0 20px 50px rgba(34, 51, 93, 0.08)',
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Text size="xs" tt="uppercase" fw={700} c="indigo" style={{ letterSpacing: '0.12em' }}>
              Clinical Chart
            </Text>
            <Text fw={800} fz="2rem" style={{ letterSpacing: '-0.03em' }}>
              {client ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.id : 'Client summary'}
            </Text>
            <Text c="dimmed" maw={720}>
              The chart should answer three questions immediately: what happened last, what needs attention now, and what is coming next.
            </Text>
          </Stack>
          <Group gap="xs">
            {client?.status ? <Badge color="indigo" variant="light">{client.status}</Badge> : null}
            {client?.highTouchpoint ? <Badge color="orange" variant="light">High touchpoint</Badge> : null}
          </Group>
        </Group>
      </Paper>

      {summary.loading ? (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={180} radius="xl" />
          ))}
        </SimpleGrid>
      ) : summary.error ? (
        <Paper withBorder radius="xl" p="lg">
          <Text c="red" size="sm">{summary.error}</Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
          <SummaryCard
            title="Session rhythm"
            eyebrow="Schedule"
            accent="linear-gradient(90deg, #4f46e5, #6366f1)"
            badge={<ThemeIcon radius="xl" size="lg" color="indigo" variant="light">S</ThemeIcon>}
          >
            <Stack gap="sm">
              <div>
                <Text size="xs" c="dimmed" mb={4}>Last session</Text>
                <Text fw={700}>{formatDateTime(derived.lastSession?.startsAt ?? derived.lastSession?.scheduledAt ?? null)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" mb={4}>Next session</Text>
                <Text fw={700}>{formatDateTime(derived.nextSession?.startsAt ?? derived.nextSession?.scheduledAt ?? null)}</Text>
              </div>
              <Progress
                value={derived.nextSession ? 100 : derived.lastSession ? 55 : 18}
                color={derived.nextSession ? 'indigo' : derived.lastSession ? 'blue' : 'gray'}
                radius="xl"
              />
            </Stack>
          </SummaryCard>

          <SummaryCard
            title="Note readiness"
            eyebrow="Documentation"
            accent="linear-gradient(90deg, #14b8a6, #22c55e)"
            badge={<Badge color={derived.noteState.color} variant="light">{derived.noteState.label}</Badge>}
          >
            <Stack gap="sm">
              <Text size="sm" c="dimmed">{derived.noteState.detail}</Text>
              <Progress value={derived.noteState.completionPct} color={derived.noteState.color} radius="xl" />
              <Group grow>
                <div>
                  <Text size="xs" c="dimmed">Draft notes</Text>
                  <Text fw={700} fz="lg">{derived.noteState.draftNotes}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Signed notes</Text>
                  <Text fw={700} fz="lg">{derived.noteState.signedNotes}</Text>
                </div>
              </Group>
            </Stack>
          </SummaryCard>

          <SummaryCard
            title="Treatment plan"
            eyebrow="Plan"
            accent="linear-gradient(90deg, #3b82f6, #4f46e5)"
            badge={<Badge color={summary.plan ? 'teal' : 'gray'} variant="light">{summary.plan?.status ?? 'No plan'}</Badge>}
          >
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                {summary.plan
                  ? `Reviewed ${formatDate(summary.plan.reviewedAt)}${summary.plan.reviewCadence ? ` · ${summary.plan.reviewCadence}` : ''}`
                  : 'Build the treatment plan around concrete goals, interventions, and review rhythm.'}
              </Text>
              <Group grow>
                <div>
                  <Text size="xs" c="dimmed">Goals</Text>
                  <Text fw={700} fz="lg">{derived.goals.length}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Interventions</Text>
                  <Text fw={700} fz="lg">{derived.interventions.length}</Text>
                </div>
              </Group>
              <Progress value={Math.min(100, (derived.goals.length * 20) + (derived.interventions.length * 10))} color="teal" radius="xl" />
            </Stack>
          </SummaryCard>

          <SummaryCard
            title="Assessment signal"
            eyebrow="Measures"
            accent="linear-gradient(90deg, #f59e0b, #ef4444)"
            badge={<Badge color={derived.assessmentTone.color} variant="light">{derived.assessmentTone.label}</Badge>}
          >
            <Stack gap="sm">
              <div>
                <Text size="xs" c="dimmed" mb={4}>Latest instrument</Text>
                <Text fw={700}>
                  {derived.latestAssessment ? `${derived.latestAssessment.formTitle ?? derived.latestAssessment.formKey ?? 'Assessment'} · ${derived.latestAssessment.scoreValue}` : 'No scored assessments yet'}
                </Text>
              </div>
              <Text size="sm" c="dimmed">
                {derived.latestAssessment
                  ? `${derived.latestAssessment.interpretationLabel ?? derived.latestAssessment.scoreLabel ?? 'Interpretation unavailable'} · completed ${formatDate(derived.latestAssessment.submittedAt)}`
                  : 'Assessment trends will appear here as clients complete scored instruments.'}
              </Text>
              <Progress value={derived.latestAssessment ? Math.min(100, Number(derived.latestAssessment.scoreValue ?? 0) * 4) : 0} color={derived.assessmentTone.color} radius="xl" />
            </Stack>
          </SummaryCard>
        </SimpleGrid>
      )}
    </Stack>
  );
}
