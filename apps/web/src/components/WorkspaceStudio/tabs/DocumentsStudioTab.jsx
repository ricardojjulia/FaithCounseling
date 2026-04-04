import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../../../lib/csrf.js';
import FormRunner from '../../Documents/FormRunner.jsx';
import { FORM_DEF_BY_ID, FORM_OPTION_LIST } from '../../Documents/formRegistry.js';

const ASSIGNMENT_TYPE_OPTIONS = [
  { value: 'next_session', label: 'Next Session' },
  { value: 'future_session', label: 'Future Session' },
  { value: 'scheduled_recurring', label: 'Recurring Schedule' },
  { value: 'account_signup', label: 'Signup Standard' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusColor(status) {
  return {
    assigned: 'yellow',
    in_progress: 'blue',
    completed: 'green',
    cancelled: 'gray',
  }[status] ?? 'gray';
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error || body?.message || message;
    } catch {
      // ignore json parse failure
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

function isNotFoundError(error) {
  return error?.status === 404 || /not found/i.test(String(error?.message || ''));
}

function deriveHistoryFromSubmissions(submissions) {
  const byForm = new Map();
  for (const submission of submissions) {
    const key = submission.formKey;
    const existing = byForm.get(key) ?? {
      formKey: key,
      formTitle: submission.formTitle ?? key,
      submissions: 0,
      latestVersion: 0,
      lastSubmittedAt: null,
      lastScoreLabel: null,
      lastScoreValue: null,
      lastInterpretationLabel: null,
    };
    existing.submissions += 1;
    existing.latestVersion = Math.max(existing.latestVersion, Number(submission.submissionVersion) || 0);
    if (!existing.lastSubmittedAt || String(submission.submittedAt) > String(existing.lastSubmittedAt)) {
      existing.lastSubmittedAt = submission.submittedAt;
      existing.lastScoreLabel = submission.scoreLabel ?? null;
      existing.lastScoreValue = submission.scoreValue ?? null;
      existing.lastInterpretationLabel = submission.interpretationLabel ?? null;
      existing.formTitle = submission.formTitle ?? existing.formTitle;
    }
    byForm.set(key, existing);
  }
  return [...byForm.values()].sort((left, right) => String(right.lastSubmittedAt || '').localeCompare(String(left.lastSubmittedAt || '')));
}

function AssignmentComposer({ clientId, onCreated }) {
  const [formKey, setFormKey] = useState('');
  const [assignmentType, setAssignmentType] = useState('next_session');
  const [scheduledFor, setScheduledFor] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const createAssignment = async () => {
    if (!clientId || !formKey) {
      notifications.show({ color: 'red', title: 'Missing fields', message: 'Choose a client and form first.' });
      return;
    }
    setSaving(true);
    const formDef = FORM_DEF_BY_ID[formKey];
    try {
      await apiFetch('/api/v1/forms/assignments', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({
          clientId,
          formKey,
          formTitle: formDef?.title ?? formKey,
          assignmentType,
          scheduledFor: toIsoDate(scheduledFor),
          dueAt: toIsoDate(dueAt),
          recurrenceRule: recurrenceRule.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      notifications.show({ color: 'green', title: 'Assigned', message: 'Form assigned to client.' });
      setNotes('');
      setRecurrenceRule('');
      setScheduledFor('');
      setDueAt('');
      onCreated?.();
    } catch (error) {
      notifications.show({ color: 'red', title: 'Assignment failed', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Title order={5}>Assign Form</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Form"
            data={FORM_OPTION_LIST}
            value={formKey}
            onChange={(value) => setFormKey(value || '')}
            searchable
            placeholder="Select a form"
          />
          <Select
            label="Timing"
            data={ASSIGNMENT_TYPE_OPTIONS}
            value={assignmentType}
            onChange={(value) => setAssignmentType(value || 'next_session')}
          />
          <TextInput
            label="Session / Schedule Time"
            type="datetime-local"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            disabled={assignmentType === 'next_session'}
          />
          <TextInput
            label="Due By"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
          <TextInput
            label="Recurring Rule"
            value={recurrenceRule}
            onChange={(event) => setRecurrenceRule(event.target.value)}
            placeholder="e.g. FREQ=WEEKLY;BYDAY=MO"
            disabled={assignmentType !== 'scheduled_recurring'}
          />
          <TextInput
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional counselor note"
          />
        </SimpleGrid>
        <Group justify="flex-end">
          <Button loading={saving} onClick={createAssignment}>Assign Form</Button>
        </Group>
      </Stack>
    </Paper>
  );
}

export default function DocumentsStudioTab({ initialClientId = '' }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(initialClientId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState({ assignments: [], history: [], submissions: [] });
  const [activeAssignment, setActiveAssignment] = useState(null);

  const loadOverviewFallback = useCallback(async (currentClientId) => {
    const [assignmentsResult, submissionsResult] = await Promise.allSettled([
      apiFetch(`/api/v1/forms/assignments?clientId=${encodeURIComponent(currentClientId)}`),
      apiFetch(`/api/v1/forms/submissions?clientId=${encodeURIComponent(currentClientId)}`),
    ]);

    if (assignmentsResult.status === 'rejected' && !isNotFoundError(assignmentsResult.reason)) {
      throw assignmentsResult.reason;
    }
    if (submissionsResult.status === 'rejected' && !isNotFoundError(submissionsResult.reason)) {
      throw submissionsResult.reason;
    }

    const assignmentsPayload = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : null;
    const submissionsPayload = submissionsResult.status === 'fulfilled' ? submissionsResult.value : null;

    const assignments = Array.isArray(assignmentsPayload?.items) ? assignmentsPayload.items : [];
    const submissions = Array.isArray(submissionsPayload?.items) ? submissionsPayload.items : [];

    setOverview({
      assignments,
      submissions,
      history: deriveHistoryFromSubmissions(submissions),
    });
  }, []);

  useEffect(() => {
    if (initialClientId) setClientId(initialClientId);
  }, [initialClientId]);

  useEffect(() => {
    apiFetch('/api/v1/clients?limit=200')
      .then((payload) => {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setClients(items.map((item) => ({
          value: item.id,
          label: `${item.firstName} ${item.lastName}`,
        })));
      })
      .catch(() => {
        setClients([]);
      });
  }, []);

  const loadOverview = useCallback((currentClientId) => {
    if (!currentClientId) {
      setOverview({ assignments: [], history: [], submissions: [] });
      return;
    }
    setLoading(true);
    setError('');
    apiFetch(`/api/v1/forms/client-overview?clientId=${encodeURIComponent(currentClientId)}`)
      .then((payload) => {
        setOverview({
          assignments: Array.isArray(payload?.assignments) ? payload.assignments : [],
          history: Array.isArray(payload?.history) ? payload.history : [],
          submissions: Array.isArray(payload?.submissions) ? payload.submissions : [],
        });
      })
      .catch(async (err) => {
        const notFound = isNotFoundError(err);
        if (notFound) {
          try {
            await loadOverviewFallback(currentClientId);
            setError('');
            return;
          } catch (fallbackError) {
            setError(fallbackError.message);
            return;
          }
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [loadOverviewFallback]);

  useEffect(() => {
    loadOverview(clientId);
  }, [clientId, loadOverview]);

  const assignmentRows = useMemo(() => overview.assignments ?? [], [overview.assignments]);
  const historyRows = useMemo(() => overview.history ?? [], [overview.history]);

  const handleCompleteSubmission = async ({ form, answers, scoreSummary }) => {
    if (!clientId || !form?.id) return;
    try {
      await apiFetch('/api/v1/forms/submissions', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({
          clientId,
          formKey: form.id,
          formTitle: form.title,
          assignmentId: activeAssignment?.id ?? null,
          responses: answers,
          scoreLabel: scoreSummary?.scoreLabel ?? null,
          scoreValue: scoreSummary?.scoreValue ?? null,
          interpretationLabel: scoreSummary?.interpretationLabel ?? null,
          submittedByType: 'counselor',
        }),
      });
      notifications.show({ color: 'green', title: 'Saved', message: 'Form submission has been stored.' });
      setActiveAssignment(null);
      loadOverview(clientId);
    } catch (submissionError) {
      notifications.show({ color: 'red', title: 'Save failed', message: submissionError.message });
    }
  };

  if (activeAssignment) {
    const formDef = FORM_DEF_BY_ID[activeAssignment.formKey];
    if (!formDef) {
      return (
        <Alert color="red" title="Missing Form Definition">
          Unable to open {activeAssignment.formTitle}. The form key {activeAssignment.formKey} is not registered.
        </Alert>
      );
    }
    return (
      <FormRunner
        formDef={formDef}
        onClose={() => setActiveAssignment(null)}
        onComplete={handleCompleteSubmission}
      />
    );
  }

  return (
    <Stack gap="md" maw={1100}>
      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Title order={4}>Documents & Inventories Workflow</Title>
          <Text fz="sm" c="dimmed">
            Assign forms for next sessions, future sessions, or recurring schedules. Use the same form repeatedly to track client progress over time.
          </Text>
          <Select
            label="Client"
            placeholder="Select a client"
            data={clients}
            searchable
            value={clientId}
            onChange={(value) => setClientId(value || '')}
            maw={440}
          />
        </Stack>
      </Paper>

      {!clientId && (
        <Alert color="blue" title="Choose a client">
          Pick a client to manage form assignments and view completion history.
        </Alert>
      )}

      {clientId && (
        <>
          <AssignmentComposer clientId={clientId} onCreated={() => loadOverview(clientId)} />

          {loading && (
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          )}

          {error && (
            <Alert color="red" title="Unable to load form overview">{error}</Alert>
          )}

          {!loading && !error && (
            <>
              <Paper withBorder radius="md" p="md">
                <Group justify="space-between" mb="xs">
                  <Title order={5}>Assignments</Title>
                  <Badge color="gray" variant="light">{assignmentRows.length}</Badge>
                </Group>
                {!assignmentRows.length ? (
                  <Text fz="sm" c="dimmed">No assignments yet for this client.</Text>
                ) : (
                  <Table striped withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Form</Table.Th>
                        <Table.Th>Timing</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Scheduled</Table.Th>
                        <Table.Th>Due</Table.Th>
                        <Table.Th>Action</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {assignmentRows.map((assignment) => (
                        <Table.Tr key={assignment.id}>
                          <Table.Td>{assignment.formTitle}</Table.Td>
                          <Table.Td>{assignment.assignmentType}</Table.Td>
                          <Table.Td>
                            <Badge color={statusColor(assignment.status)} variant="light">{assignment.status}</Badge>
                          </Table.Td>
                          <Table.Td>{formatDate(assignment.scheduledFor)}</Table.Td>
                          <Table.Td>{formatDate(assignment.dueAt)}</Table.Td>
                          <Table.Td>
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => setActiveAssignment(assignment)}
                              disabled={!FORM_DEF_BY_ID[assignment.formKey]}
                            >
                              Fill Form
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>

              <Paper withBorder radius="md" p="md">
                <Group justify="space-between" mb="xs">
                  <Title order={5}>Previously Completed Forms</Title>
                  <Badge color="teal" variant="light">{historyRows.length}</Badge>
                </Group>
                {!historyRows.length ? (
                  <Text fz="sm" c="dimmed">No form submissions yet for this client.</Text>
                ) : (
                  <Table striped withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Form</Table.Th>
                        <Table.Th>Submissions</Table.Th>
                        <Table.Th>Latest Version</Table.Th>
                        <Table.Th>Last Submitted</Table.Th>
                        <Table.Th>Last Score</Table.Th>
                        <Table.Th>Interpretation</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {historyRows.map((row) => (
                        <Table.Tr key={row.formKey}>
                          <Table.Td>{row.formTitle}</Table.Td>
                          <Table.Td>{row.submissions}</Table.Td>
                          <Table.Td>v{row.latestVersion}</Table.Td>
                          <Table.Td>{formatDate(row.lastSubmittedAt)}</Table.Td>
                          <Table.Td>{row.lastScoreValue ?? '—'} {row.lastScoreLabel ? `(${row.lastScoreLabel})` : ''}</Table.Td>
                          <Table.Td>{row.lastInterpretationLabel ?? '—'}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            </>
          )}
        </>
      )}
    </Stack>
  );
}
