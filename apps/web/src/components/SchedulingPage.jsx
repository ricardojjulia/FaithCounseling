import { useEffect, useMemo, useState } from 'react';
import { useForm } from '@mantine/form';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  createAppointmentRecord,
  createReminderRecord,
  deleteAppointmentRecord,
  fetchAppointments,
  fetchAppointmentTypes,
  fetchReminders,
  fetchSchedulingCalendar,
  fetchStaff,
  fetchWaitlist,
  patchReminderRecord,
  patchWaitlistEntry,
  updateAppointmentRecord,
} from '../lib/clientApi.js';
import { frontendTelemetry } from '../lib/frontendTelemetry.js';
import { useSurfaceTelemetry } from '../lib/useSurfaceTelemetry.js';
import {
  createAvailabilityOverride,
  createSeries,
  deleteAvailabilityOverride,
  fetchAvailabilityOverrides,
  fetchSeries,
  fetchUtilization,
  updateAvailabilityOverride,
  updateSeries,
} from '../lib/clientApi.js';

const GLOBAL_SCHEDULING_ROLES = new Set([
  'platform_admin',
  'practice_owner',
  'practice_admin',
  'scheduler_biller',
]);

const COUNSELING_ROLES = new Set(['counselor', 'intern']);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}

function toLocalDateTimeInputValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoFromLocalDateTime(localValue) {
  if (!localValue) return null;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDateLabel(day) {
  if (!day) return 'Selected day';
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso, timezone) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined,
  });
}

function formatTime(iso, timezone) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined,
  });
}

function statusColor(status) {
  return {
    scheduled: 'blue',
    checked_in: 'cyan',
    completed: 'green',
    cancelled: 'red',
    no_show: 'orange',
  }[status] || 'gray';
}

function typeLabel(code) {
  return (code || 'appointment')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveStaffName(staff) {
  return [staff?.firstName, staff?.lastName].filter(Boolean).join(' ').trim();
}

function AppointmentComposer({
  opened,
  onClose,
  onCreated,
  clients,
  counselors,
  appointmentTypes,
  initialClientId,
  initialPortalRequest,
  mode,
  editingAppointment,
  onPortalRequestScheduled,
  timezone,
  currentUser,
}) {
  const [saving, setSaving] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [conflicts, setConflicts] = useState([]);

  const counselorOptions = counselors.map((staff) => ({
    value: resolveStaffName(staff),
    label: `${resolveStaffName(staff)}${staff.role ? ` · ${staff.role}` : ''}`,
  })).filter((option) => option.value);

  const clientOptions = (clients || []).map((client) => ({
    value: client.id,
    label: `${client.firstName} ${client.lastName}`.trim(),
  }));

  const typeOptions = (appointmentTypes || []).map((item) => ({
    value: item.code,
    label: item.label,
  }));

  const form = useForm({
    initialValues: {
      clientId: initialClientId || '',
      appointmentType: 'individual_therapy',
      counselorName: currentUser?.name || '',
      startsAt: '',
      endsAt: '',
      locationName: 'Main Office',
      remoteSession: false,
      timezone: timezone || detectTimezone(),
    },
    validate: {
      clientId: (value) => value ? null : 'Client is required',
      appointmentType: (value) => value ? null : 'Appointment type is required',
      counselorName: (value) => value.trim() ? null : 'Counselor is required',
      startsAt: (value) => value ? null : 'Start time is required',
      endsAt: (value) => value ? null : 'End time is required',
    },
  });

  useEffect(() => {
    if (!opened) return;
    const startsAtValue = editingAppointment
      ? toLocalDateTimeInputValue(editingAppointment.startsAt)
      : toLocalDateTimeInputValue(initialPortalRequest?.preferredStartAt);
    const endsAtValue = editingAppointment
      ? toLocalDateTimeInputValue(editingAppointment.endsAt)
      : toLocalDateTimeInputValue(initialPortalRequest?.preferredEndAt);
    const isRemoteFromRequest = initialPortalRequest?.mode === 'remote';
    form.setValues({
      clientId: editingAppointment?.clientId || initialClientId || '',
      appointmentType: editingAppointment?.appointmentType || 'individual_therapy',
      counselorName: editingAppointment?.counselorName || currentUser?.name || '',
      startsAt: startsAtValue || '',
      endsAt: endsAtValue || '',
      locationName: editingAppointment?.locationName || (isRemoteFromRequest ? 'Remote Session' : 'Main Office'),
      remoteSession: editingAppointment?.remoteSession ?? isRemoteFromRequest,
      timezone: timezone || detectTimezone(),
    });
    form.resetDirty();
    setConflictMessage('');
    setConflicts([]);
  }, [opened, editingAppointment, initialClientId, initialPortalRequest, timezone, currentUser?.name]);

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    setConflictMessage('');
    setConflicts([]);
    try {
      const startsAt = toIsoFromLocalDateTime(values.startsAt);
      const endsAt = toIsoFromLocalDateTime(values.endsAt);

      if (!startsAt || !endsAt) {
        form.setErrors({
          startsAt: startsAt ? null : 'Start time must be valid',
          endsAt: endsAt ? null : 'End time must be valid',
        });
        return;
      }

      if (new Date(endsAt) <= new Date(startsAt)) {
        form.setFieldError('endsAt', 'End time must be after start time');
        return;
      }

      if (mode === 'edit' && editingAppointment?.id) {
        await updateAppointmentRecord(editingAppointment.id, {
          appointmentType: values.appointmentType,
          counselorName: values.counselorName.trim(),
          startsAt,
          endsAt,
          locationName: values.remoteSession ? 'Remote Session' : values.locationName.trim() || 'Main Office',
          remoteSession: values.remoteSession,
          timezone: values.timezone || detectTimezone(),
        });
        notifications.show({
          title: 'Appointment updated',
          message: 'The appointment has been updated.',
          color: 'green',
        });
      } else {
        await createAppointmentRecord({
          clientId: values.clientId,
          appointmentType: values.appointmentType,
          counselorName: values.counselorName.trim(),
          startsAt,
          endsAt,
          locationName: values.remoteSession ? 'Remote Session' : values.locationName.trim() || 'Main Office',
          remoteSession: values.remoteSession,
          timezone: values.timezone || detectTimezone(),
          status: 'scheduled',
        });

        if (initialPortalRequest?.id) {
          onPortalRequestScheduled?.(initialPortalRequest);
        }

        notifications.show({
          title: 'Appointment created',
          message: 'The appointment was added to the calendar.',
          color: 'green',
        });
      }
      onCreated?.();
      onClose?.();
    } catch (error) {
      if (Array.isArray(error?.conflicts) && error.conflicts.length) {
        setConflictMessage(error.message || 'Scheduling conflict detected');
        setConflicts(error.conflicts);
      }
      notifications.show({
        title: 'Unable to create appointment',
        message: error.message || 'The appointment could not be created.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal opened={opened} onClose={saving ? undefined : onClose} title={mode === 'edit' ? 'Edit Appointment' : 'New Appointment'} size="lg">
      <form onSubmit={submit}>
        <Stack gap="sm">
          {initialPortalRequest?.id && mode !== 'edit' ? (
            <Alert color="blue" title="Portal request">
              This appointment is being scheduled from a portal request and will mark that request as scheduled.
            </Alert>
          ) : null}

          {conflictMessage ? (
            <Alert color="red" title="Scheduling conflict detected">
              <Stack gap={6}>
                <Text fz="sm">{conflictMessage}</Text>
                {conflicts.map((conflict, index) => (
                  <Text key={`${conflict.appointmentId || 'conflict'}-${index}`} fz="xs">
                    {conflict.type || 'Conflict'}: {conflict.appointmentId || 'existing appointment'}
                  </Text>
                ))}
              </Stack>
            </Alert>
          ) : null}

          <Select
            label="Client"
            searchable
            data={clientOptions}
            nothingFoundMessage="No clients"
            disabled={mode === 'edit'}
            {...form.getInputProps('clientId')}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Appointment Type"
              data={typeOptions}
              {...form.getInputProps('appointmentType')}
            />
            <Select
              label="Counselor"
              searchable
              data={counselorOptions}
              nothingFoundMessage="No counselors"
              {...form.getInputProps('counselorName')}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Start"
              type="datetime-local"
              {...form.getInputProps('startsAt')}
            />
            <TextInput
              label="End"
              type="datetime-local"
              {...form.getInputProps('endsAt')}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Location"
              disabled={form.values.remoteSession}
              {...form.getInputProps('locationName')}
            />
            <TextInput label="Timezone" {...form.getInputProps('timezone')} />
          </SimpleGrid>

          <Checkbox
            label="Remote session"
            checked={form.values.remoteSession}
            onChange={(event) => form.setFieldValue('remoteSession', event.currentTarget.checked)}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>{mode === 'edit' ? 'Save Changes' : 'Create Appointment'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function AppointmentTable({ appointments, timezone, onOpenClient, onEdit, onDelete, onStatusChange }) {
  if (!appointments.length) {
    return <Text c="dimmed" fz="sm">No appointments scheduled for this day.</Text>;
  }

  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Time</Table.Th>
          <Table.Th>Client</Table.Th>
          <Table.Th>Counselor</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Location</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Action</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {appointments.map((appointment) => (
          <Table.Tr key={appointment.id}>
            <Table.Td>
              {formatTime(appointment.startsAt, timezone)} - {formatTime(appointment.endsAt, timezone)}
            </Table.Td>
            <Table.Td>{appointment.clientName}</Table.Td>
            <Table.Td>{appointment.counselorName}</Table.Td>
            <Table.Td>{typeLabel(appointment.appointmentType)}</Table.Td>
            <Table.Td>{appointment.remoteSession ? 'Remote Session' : (appointment.locationName || 'Main Office')}</Table.Td>
            <Table.Td>
              <Badge color={statusColor(appointment.status)} variant="light">
                {appointment.status}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Group gap="xs" wrap="nowrap">
                <Button
                  size="xs"
                  variant="default"
                  disabled={!appointment.clientId || !onOpenClient}
                  onClick={() => onOpenClient?.(appointment.clientId)}
                >
                  Open
                </Button>
                <Button size="xs" variant="default" onClick={() => onEdit?.(appointment)}>Edit</Button>
                {appointment.status !== 'completed' ? (
                  <Button size="xs" color="green" variant="light" onClick={() => onStatusChange?.(appointment, 'completed')}>
                    Complete
                  </Button>
                ) : null}
                {appointment.status !== 'cancelled' ? (
                  <Button size="xs" color="orange" variant="light" onClick={() => onStatusChange?.(appointment, 'cancelled')}>
                    Cancel
                  </Button>
                ) : null}
                {appointment.status !== 'no_show' ? (
                  <Button size="xs" color="yellow" variant="light" onClick={() => onStatusChange?.(appointment, 'no_show')}>
                    No-show
                  </Button>
                ) : null}
                <Button size="xs" color="red" variant="light" onClick={() => onDelete?.(appointment)}>Delete</Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function CounselorCalendarCards({ calendars, timezone }) {
  if (!calendars.length) {
    return <Text c="dimmed" fz="sm">No counselor calendars available for this day.</Text>;
  }

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      {calendars.map((calendar) => (
        <Card key={calendar.counselorName} withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={600}>{calendar.counselorName}</Text>
            <Badge variant="light">{calendar.appointments.length} appointments</Badge>
          </Group>
          <Stack gap={8}>
            {calendar.appointments.length ? calendar.appointments.map((appointment) => (
              <Paper key={appointment.id} withBorder radius="sm" p="xs">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fz="sm" fw={500}>{appointment.clientName}</Text>
                    <Text fz="xs" c="dimmed">
                      {formatTime(appointment.startsAt, timezone)} - {formatTime(appointment.endsAt, timezone)}
                    </Text>
                  </div>
                  <Badge size="xs" color={statusColor(appointment.status)} variant="light">
                    {appointment.status}
                  </Badge>
                </Group>
              </Paper>
            )) : <Text fz="sm" c="dimmed">No appointments.</Text>}
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}

function PracticeOperationsView({ calendars, locations, timezone }) {
  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Title order={3} fz="md" mb="sm">Counselor workload</Title>
        <CounselorCalendarCards calendars={calendars} timezone={timezone} />
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Title order={3} fz="md" mb="sm">Location schedule</Title>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          {locations.length ? locations.map((location) => (
            <Card key={location.locationName} withBorder radius="md" p="md">
              <Group justify="space-between" mb="xs">
                <Text fw={600}>{location.locationName}</Text>
                <Badge variant="light">{location.appointments.length} booked</Badge>
              </Group>
              <Stack gap={6}>
                {location.appointments.map((appointment) => (
                  <Text key={appointment.id} fz="sm">
                    {formatTime(appointment.startsAt, timezone)} · {appointment.clientName} · {appointment.counselorName}
                  </Text>
                ))}
              </Stack>
            </Card>
          )) : <Text c="dimmed" fz="sm">No location activity for this day.</Text>}
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}

const SESSION_TYPE_OPTIONS = [
  { value: 'either', label: 'Either' },
  { value: 'in_person', label: 'In Person' },
  { value: 'remote', label: 'Remote' },
];

const DELIVERY_CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'both', label: 'Both' },
];

function WaitlistPanel({ onPromote }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const editForm = useForm({
    initialValues: { priorityRank: 99, requestedService: '', preferredSessionType: 'either', notes: '' },
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWaitlist();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err.message || 'Unable to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (item) => {
    setEditingId(item.clientId);
    editForm.setValues({
      priorityRank: item.priorityRank ?? 99,
      requestedService: item.requestedService ?? '',
      preferredSessionType: item.preferredSessionType ?? 'either',
      notes: item.notes ?? '',
    });
  };

  const handleSave = async () => {
    try {
      await patchWaitlistEntry({ clientId: editingId, ...editForm.values });
      notifications.show({ title: 'Waitlist updated', message: 'Entry saved.', color: 'green' });
      setEditingId(null);
      await load();
    } catch (err) {
      notifications.show({ title: 'Save failed', message: err.message, color: 'red' });
    }
  };

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load waitlist">{error}</Alert>;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text c="dimmed" fz="sm">Clients awaiting an opening — sorted by priority rank.</Text>
        <Button variant="default" size="xs" onClick={load}>Refresh</Button>
      </Group>

      {items.length === 0 ? (
        <Paper withBorder radius="md" p="md">
          <Text c="dimmed" fz="sm" ta="center">No clients on the waitlist.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Priority</Table.Th>
                <Table.Th>Client</Table.Th>
                <Table.Th>Requested Service</Table.Th>
                <Table.Th>Session Type</Table.Th>
                <Table.Th>Notes</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                editingId === item.clientId ? (
                  <Table.Tr key={item.clientId}>
                    <Table.Td>
                      <TextInput
                        type="number"
                        w={70}
                        {...editForm.getInputProps('priorityRank')}
                      />
                    </Table.Td>
                    <Table.Td><Text fw={600}>{item.clientName}</Text></Table.Td>
                    <Table.Td>
                      <TextInput w={180} {...editForm.getInputProps('requestedService')} />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        w={130}
                        data={SESSION_TYPE_OPTIONS}
                        {...editForm.getInputProps('preferredSessionType')}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput w={200} {...editForm.getInputProps('notes')} />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" onClick={handleSave}>Save</Button>
                        <Button size="xs" variant="default" onClick={() => setEditingId(null)}>Cancel</Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  <Table.Tr key={item.clientId}>
                    <Table.Td><Badge variant="outline">{item.priorityRank}</Badge></Table.Td>
                    <Table.Td><Text fw={600}>{item.clientName}</Text></Table.Td>
                    <Table.Td>{item.requestedService || '—'}</Table.Td>
                    <Table.Td>{item.preferredSessionType || '—'}</Table.Td>
                    <Table.Td><Text fz="sm" c="dimmed" lineClamp={1}>{item.notes || '—'}</Text></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="default" onClick={() => handleEdit(item)}>Edit</Button>
                        <Button size="xs" color="blue" variant="light" onClick={() => onPromote?.(item.clientId)}>Schedule</Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}

function AvailabilityOverridesPanel({ staff }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatorOpen, setCreatorOpen] = useState(false);
  const form = useForm({
    initialValues: {
      staffId: '',
      overrideDate: '',
      overrideType: 'block',
      reason: '',
      startTime: '',
      endTime: '',
      allDay: true,
    },
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAvailabilityOverrides();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err.message || 'Unable to load overrides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (values) => {
    try {
      await createAvailabilityOverride(values);
      notifications.show({ title: 'Override created', message: 'Availability override saved.', color: 'green' });
      setCreatorOpen(false);
      form.reset();
      await load();
    } catch (err) {
      notifications.show({ title: 'Create failed', message: err.message, color: 'red' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAvailabilityOverride(id);
      notifications.show({ title: 'Override removed', message: 'Availability override deleted.', color: 'teal' });
      await load();
    } catch (err) {
      notifications.show({ title: 'Delete failed', message: err.message, color: 'red' });
    }
  };

  const staffOptions = staff.map((s) => ({
    value: s.id,
    label: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.id,
  }));

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load overrides">{error}</Alert>;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text c="dimmed" fz="sm">Block or open specific dates for staff members (PTO, holidays, one-off availability).</Text>
        <Group gap="xs">
          <Button variant="default" size="xs" onClick={load}>Refresh</Button>
          <Button size="xs" onClick={() => setCreatorOpen(true)}>Add Override</Button>
        </Group>
      </Group>

      <Modal opened={creatorOpen} onClose={() => setCreatorOpen(false)} title="Add Availability Override" size="md">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack gap="sm">
            <Select
              label="Staff Member"
              placeholder="Select staff"
              data={staffOptions}
              searchable
              required
              {...form.getInputProps('staffId')}
            />
            <TextInput label="Date" type="date" required {...form.getInputProps('overrideDate')} />
            <Select
              label="Type"
              data={[{ value: 'block', label: 'Block (unavailable)' }, { value: 'open', label: 'Open (available)' }]}
              {...form.getInputProps('overrideType')}
            />
            <TextInput label="Reason" placeholder="e.g. PTO, Holiday" {...form.getInputProps('reason')} />
            <Checkbox label="All Day" {...form.getInputProps('allDay', { type: 'checkbox' })} />
            {!form.values.allDay && (
              <Group grow>
                <TextInput label="Start Time" placeholder="09:00" {...form.getInputProps('startTime')} />
                <TextInput label="End Time" placeholder="17:00" {...form.getInputProps('endTime')} />
              </Group>
            )}
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setCreatorOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {items.length === 0 ? (
        <Paper withBorder radius="md" p="md">
          <Text c="dimmed" fz="sm" ta="center">No overrides configured.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Staff ID</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>All Day</Table.Th>
                <Table.Th>Time Range</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.overrideDate}</Table.Td>
                  <Table.Td><Badge color={item.overrideType === 'open' ? 'green' : 'red'}>{item.overrideType}</Badge></Table.Td>
                  <Table.Td>{item.staffId}</Table.Td>
                  <Table.Td>{item.reason || '—'}</Table.Td>
                  <Table.Td>{item.allDay ? 'Yes' : 'No'}</Table.Td>
                  <Table.Td>{item.allDay ? '—' : `${item.startTime || '?'} – ${item.endTime || '?'}`}</Table.Td>
                  <Table.Td>
                    <Button size="xs" color="red" variant="light" onClick={() => handleDelete(item.id)}>Remove</Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}

function SeriesPanel({ staff, clients }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatorOpen, setCreatorOpen] = useState(false);
  const form = useForm({
    initialValues: {
      counselorId: '',
      clientId: '',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
      startDate: '',
      endDate: '',
      durationMinutes: '50',
      appointmentType: '',
      remoteSession: false,
    },
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSeries();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err.message || 'Unable to load series');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (values) => {
    const counselor = staff.find((s) => s.id === values.counselorId);
    const client = clients.find((c) => c.id === values.clientId);
    try {
      await createSeries({
        ...values,
        durationMinutes: Number(values.durationMinutes) || 50,
        counselorName: counselor ? [counselor.firstName, counselor.lastName].filter(Boolean).join(' ') : '',
        clientName: client ? [client.firstName, client.lastName].filter(Boolean).join(' ') : '',
      });
      notifications.show({ title: 'Series created', message: 'Recurring series saved.', color: 'green' });
      setCreatorOpen(false);
      form.reset();
      await load();
    } catch (err) {
      notifications.show({ title: 'Create failed', message: err.message, color: 'red' });
    }
  };

  const handleCancel = async (id) => {
    try {
      await updateSeries({ id, status: 'cancelled' });
      notifications.show({ title: 'Series cancelled', message: 'Recurring series cancelled.', color: 'orange' });
      await load();
    } catch (err) {
      notifications.show({ title: 'Cancel failed', message: err.message, color: 'red' });
    }
  };

  const staffOptions = staff.map((s) => ({
    value: s.id,
    label: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.id,
  }));

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.id,
  }));

  const seriesStatusColor = (s) => ({ active: 'green', cancelled: 'gray', completed: 'blue' }[s] || 'gray');

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load series">{error}</Alert>;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text c="dimmed" fz="sm">Manage recurring appointment series for ongoing client relationships.</Text>
        <Group gap="xs">
          <Button variant="default" size="xs" onClick={load}>Refresh</Button>
          <Button size="xs" onClick={() => setCreatorOpen(true)}>New Series</Button>
        </Group>
      </Group>

      <Modal opened={creatorOpen} onClose={() => setCreatorOpen(false)} title="New Recurring Series" size="md">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack gap="sm">
            <Select label="Counselor" placeholder="Select counselor" data={staffOptions} searchable required {...form.getInputProps('counselorId')} />
            <Select label="Client" placeholder="Select client" data={clientOptions} searchable required {...form.getInputProps('clientId')} />
            <TextInput label="Recurrence Rule" placeholder="FREQ=WEEKLY;BYDAY=MO" required {...form.getInputProps('recurrenceRule')} />
            <Group grow>
              <TextInput label="Start Date" type="date" required {...form.getInputProps('startDate')} />
              <TextInput label="End Date" type="date" {...form.getInputProps('endDate')} />
            </Group>
            <Group grow>
              <TextInput label="Duration (min)" type="number" placeholder="50" {...form.getInputProps('durationMinutes')} />
              <TextInput label="Appointment Type" placeholder="Individual therapy" {...form.getInputProps('appointmentType')} />
            </Group>
            <Checkbox label="Remote session" {...form.getInputProps('remoteSession', { type: 'checkbox' })} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setCreatorOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {items.length === 0 ? (
        <Paper withBorder radius="md" p="md">
          <Text c="dimmed" fz="sm" ta="center">No recurring series configured.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Client</Table.Th>
                <Table.Th>Counselor</Table.Th>
                <Table.Th>Rule</Table.Th>
                <Table.Th>Start</Table.Th>
                <Table.Th>End</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.clientName || item.clientId}</Table.Td>
                  <Table.Td>{item.counselorName || item.counselorId}</Table.Td>
                  <Table.Td><Text fz="xs" ff="monospace">{item.recurrenceRule}</Text></Table.Td>
                  <Table.Td>{item.startDate}</Table.Td>
                  <Table.Td>{item.endDate || '—'}</Table.Td>
                  <Table.Td><Badge color={seriesStatusColor(item.status)}>{item.status}</Badge></Table.Td>
                  <Table.Td>
                    {item.status === 'active' && (
                      <Button size="xs" color="orange" variant="light" onClick={() => handleCancel(item.id)}>Cancel</Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}

function UtilizationPanel() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchUtilization({ from: from || undefined, to: to || undefined });
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Unable to load utilization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load utilization">{error}</Alert>;

  return (
    <Stack gap="md">
      <Group align="flex-end" gap="sm">
        <TextInput label="From" type="date" value={from} onChange={(e) => setFrom(e.currentTarget.value)} />
        <TextInput label="To" type="date" value={to} onChange={(e) => setTo(e.currentTarget.value)} />
        <Button onClick={load}>Apply</Button>
      </Group>

      {summary && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <Card withBorder radius="md" p="md">
            <Text c="dimmed" fz="xs" tt="uppercase" fw={500}>Total</Text>
            <Text fz="xl" fw={700}>{summary.totalAppointments}</Text>
          </Card>
          {Object.entries(summary.byStatus ?? {}).map(([status, count]) => (
            <Card key={status} withBorder radius="md" p="md">
              <Text c="dimmed" fz="xs" tt="uppercase" fw={500}>{status}</Text>
              <Text fz="xl" fw={700}>{count}</Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {summary?.byCounselor?.length > 0 && (
        <Paper withBorder radius="md">
          <Title order={4} fz="sm" p="sm">By Counselor</Title>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Counselor ID</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Completed</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summary.byCounselor.map((row) => (
                <Table.Tr key={row.counselorId}>
                  <Table.Td>{row.counselorId}</Table.Td>
                  <Table.Td>{row.count}</Table.Td>
                  <Table.Td>{row.completedCount}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}

function RemindersPanel({ appointments }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatorOpen, setCreatorOpen] = useState(false);
  const createForm = useForm({
    initialValues: {
      appointmentId: '',
      reminderType: 'appointment',
      deliveryChannel: 'email',
      reminderAt: '',
    },
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReminders();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err.message || 'Unable to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (values) => {
    try {
      await createReminderRecord(values);
      notifications.show({ title: 'Reminder created', message: 'Reminder scheduled.', color: 'green' });
      setCreatorOpen(false);
      createForm.reset();
      await load();
    } catch (err) {
      notifications.show({ title: 'Create failed', message: err.message, color: 'red' });
    }
  };

  const handleStatusChange = async (reminderId, status) => {
    try {
      await patchReminderRecord({ reminderId, status });
      notifications.show({ title: 'Reminder updated', message: `Marked ${status}.`, color: 'green' });
      await load();
    } catch (err) {
      notifications.show({ title: 'Update failed', message: err.message, color: 'red' });
    }
  };

  const appointmentOptions = appointments
    .filter((a) => a.status === 'scheduled')
    .map((a) => ({
      value: a.id,
      label: `${a.clientName} — ${a.startsAt ? new Date(a.startsAt).toLocaleDateString() : ''}`,
    }));

  const reminderStatusColor = (status) => ({ pending: 'yellow', sent: 'green', cancelled: 'gray' }[status] || 'gray');

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load reminders">{error}</Alert>;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text c="dimmed" fz="sm">Manage appointment reminders sent to clients.</Text>
        <Group gap="xs">
          <Button variant="default" size="xs" onClick={load}>Refresh</Button>
          <Button size="xs" onClick={() => setCreatorOpen(true)}>New Reminder</Button>
        </Group>
      </Group>

      <Modal opened={creatorOpen} onClose={() => setCreatorOpen(false)} title="Schedule Reminder" size="md">
        <form onSubmit={createForm.onSubmit(handleCreate)}>
          <Stack gap="sm">
            <Select
              label="Appointment"
              placeholder="Select appointment"
              data={appointmentOptions}
              searchable
              required
              {...createForm.getInputProps('appointmentId')}
            />
            <Select
              label="Delivery Channel"
              data={DELIVERY_CHANNEL_OPTIONS}
              {...createForm.getInputProps('deliveryChannel')}
            />
            <TextInput
              label="Reminder Type"
              placeholder="e.g. appointment, follow_up"
              {...createForm.getInputProps('reminderType')}
            />
            <TextInput
              label="Send At"
              type="datetime-local"
              {...createForm.getInputProps('reminderAt')}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setCreatorOpen(false)}>Cancel</Button>
              <Button type="submit">Schedule</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {items.length === 0 ? (
        <Paper withBorder radius="md" p="md">
          <Text c="dimmed" fz="sm" ta="center">No reminders found. Create one from an upcoming appointment.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Status</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Channel</Table.Th>
                <Table.Th>Send At</Table.Th>
                <Table.Th>Sent At</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td><Badge color={reminderStatusColor(item.status)}>{item.status}</Badge></Table.Td>
                  <Table.Td>{typeLabel(item.reminderType)}</Table.Td>
                  <Table.Td>{item.deliveryChannel || '—'}</Table.Td>
                  <Table.Td>{item.reminderAt ? new Date(item.reminderAt).toLocaleString() : '—'}</Table.Td>
                  <Table.Td>{item.sentAt ? new Date(item.sentAt).toLocaleString() : '—'}</Table.Td>
                  <Table.Td>
                    {item.status === 'pending' ? (
                      <Group gap="xs">
                        <Button size="xs" color="green" variant="light" onClick={() => handleStatusChange(item.id, 'sent')}>
                          Mark Sent
                        </Button>
                        <Button size="xs" color="red" variant="light" onClick={() => handleStatusChange(item.id, 'cancelled')}>
                          Cancel
                        </Button>
                      </Group>
                    ) : null}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}

export default function SchedulingPage({
  currentUser,
  clients,
  initialComposerOpen = false,
  initialClientId = null,
  initialView = null,
  initialPortalRequest = null,
  onComposerHandled,
  onPortalRequestScheduled,
  onOpenClient,
}) {
  const timezone = detectTimezone();
  const canManageAll = GLOBAL_SCHEDULING_ROLES.has(currentUser?.role || '');
  const [activeTab, setActiveTab] = useState('appointments');
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [view, setView] = useState(initialView || (canManageAll ? 'practice' : 'counselor'));
  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [composerMode, setComposerMode] = useState('create');
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [composerClientId, setComposerClientId] = useState(initialClientId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [calendarPayload, setCalendarPayload] = useState({
    counselorCalendars: [],
    locationCalendars: [],
    availability: [],
  });
  const [selectedCounselorName, setSelectedCounselorName] = useState(currentUser?.name || '');

  useEffect(() => {
    if (!initialComposerOpen) return;
    setComposerOpen(true);
    setComposerMode('create');
    setEditingAppointment(null);
  }, [initialComposerOpen]);

  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!canManageAll && currentUser?.name) {
      setSelectedCounselorName(currentUser.name);
      setView('counselor');
    }
  }, [canManageAll, currentUser?.name]);

  const loadScheduling = async () => {
    setLoading(true);
    setError('');
    try {
      const [appointmentsPayload, typesPayload, calendarResponse, staffPayload] = await Promise.all([
        fetchAppointments(),
        fetchAppointmentTypes(),
        fetchSchedulingCalendar({
          day: selectedDay,
          timezone,
          counselorName: view === 'counselor' && selectedCounselorName ? selectedCounselorName : undefined,
        }),
        fetchStaff(),
      ]);
      setAppointments(Array.isArray(appointmentsPayload?.items) ? appointmentsPayload.items : []);
      setAppointmentTypes(Array.isArray(typesPayload?.items) ? typesPayload.items : []);
      setCalendarPayload({
        counselorCalendars: Array.isArray(calendarResponse?.counselorCalendars) ? calendarResponse.counselorCalendars : [],
        locationCalendars: Array.isArray(calendarResponse?.locationCalendars) ? calendarResponse.locationCalendars : [],
        availability: Array.isArray(calendarResponse?.availability) ? calendarResponse.availability : [],
      });
      setStaff(Array.isArray(staffPayload?.items) ? staffPayload.items : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load scheduling data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointment, status) => {
    const startedAt = performance.now();
    try {
      await updateAppointmentRecord(appointment.id, { status });
      frontendTelemetry.trackInteraction(activeSchedulingSurface, 'appointment.status_change', performance.now() - startedAt, {
        workflow: 'scheduling',
        result: 'success',
      });
      frontendTelemetry.trackAction(activeSchedulingSurface, 'appointment.status_change', 'success', { workflow: 'scheduling' });
      notifications.show({
        title: 'Appointment updated',
        message: `Appointment marked ${status}.`,
        color: 'green',
      });
      await loadScheduling();
    } catch (updateError) {
      frontendTelemetry.trackInteraction(activeSchedulingSurface, 'appointment.status_change', performance.now() - startedAt, {
        workflow: 'scheduling',
        result: 'failure',
        statusClass: updateError?.statusClass,
      });
      frontendTelemetry.trackAction(activeSchedulingSurface, 'appointment.status_change', 'failure', {
        workflow: 'scheduling',
        statusClass: updateError?.statusClass,
      });
      notifications.show({
        title: 'Unable to update appointment',
        message: updateError.message || 'Status change failed.',
        color: 'red',
      });
    }
  };

  const handleDelete = async (appointment) => {
    if (!window.confirm(`Delete appointment for ${appointment.clientName}?`)) return;
    const startedAt = performance.now();
    try {
      await deleteAppointmentRecord(appointment.id);
      frontendTelemetry.trackInteraction(activeSchedulingSurface, 'appointment.delete', performance.now() - startedAt, {
        workflow: 'scheduling',
        result: 'success',
      });
      frontendTelemetry.trackAction(activeSchedulingSurface, 'appointment.delete', 'success', { workflow: 'scheduling' });
      notifications.show({
        title: 'Appointment deleted',
        message: 'The appointment was removed.',
        color: 'green',
      });
      await loadScheduling();
    } catch (deleteError) {
      frontendTelemetry.trackInteraction(activeSchedulingSurface, 'appointment.delete', performance.now() - startedAt, {
        workflow: 'scheduling',
        result: 'failure',
        statusClass: deleteError?.statusClass,
      });
      frontendTelemetry.trackAction(activeSchedulingSurface, 'appointment.delete', 'failure', {
        workflow: 'scheduling',
        statusClass: deleteError?.statusClass,
      });
      notifications.show({
        title: 'Unable to delete appointment',
        message: deleteError.message || 'Delete failed.',
        color: 'red',
      });
    }
  };

  const handleEdit = (appointment) => {
    setComposerMode('edit');
    setEditingAppointment(appointment);
    setComposerOpen(true);
  };

  useEffect(() => {
    loadScheduling();
  }, [selectedDay, view, selectedCounselorName]);

  const counselors = useMemo(() => (
    staff.filter((item) => COUNSELING_ROLES.has(item.role))
  ), [staff]);

  const counselorOptions = useMemo(() => (
    counselors
      .map((item) => ({ value: resolveStaffName(item), label: resolveStaffName(item) }))
      .filter((item) => item.value)
  ), [counselors]);

  const dayAppointments = useMemo(() => (
    appointments.filter((appointment) => appointment.startsAt?.slice(0, 10) === selectedDay)
      .filter((appointment) => !selectedCounselorName || view !== 'counselor' || appointment.counselorName === selectedCounselorName)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  ), [appointments, selectedDay, selectedCounselorName, view]);

  const metrics = useMemo(() => {
    const scheduled = dayAppointments.filter((appointment) => appointment.status === 'scheduled').length;
    const remote = dayAppointments.filter((appointment) => appointment.remoteSession).length;
    const counselorsCount = new Set(dayAppointments.map((appointment) => appointment.counselorName)).size;
    return { total: dayAppointments.length, scheduled, remote, counselors: counselorsCount };
  }, [dayAppointments]);

  const filteredCounselorCalendars = useMemo(() => {
    if (!selectedCounselorName || view !== 'counselor') return calendarPayload.counselorCalendars;
    return calendarPayload.counselorCalendars.filter((calendar) => calendar.counselorName === selectedCounselorName);
  }, [calendarPayload.counselorCalendars, selectedCounselorName, view]);

  const availabilityNote = useMemo(() => {
    if (!selectedCounselorName || view !== 'counselor') return null;
    return calendarPayload.availability.find((entry) => entry.counselorName === selectedCounselorName) || null;
  }, [calendarPayload.availability, selectedCounselorName, view]);

  const activeSchedulingSurface = activeTab === 'appointments'
    ? `scheduling.${view}`
    : `scheduling.${activeTab}`;
  const emptyState = activeTab !== 'appointments'
    ? null
    : loading
      ? null
      : error
        ? null
        : dayAppointments.length === 0
          ? 'empty'
          : null;

  useSurfaceTelemetry(activeSchedulingSurface, {
    surfaceKind: activeTab === 'appointments' ? 'subview' : 'tab',
    workflow: 'scheduling',
    emptyState,
  });

  return (
    <Stack gap="md" p="md">
      <AppointmentComposer
        opened={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setComposerMode('create');
          setEditingAppointment(null);
          setComposerClientId(initialClientId);
          onComposerHandled?.();
        }}
        onCreated={loadScheduling}
        clients={clients}
        counselors={counselors}
        appointmentTypes={appointmentTypes}
        initialClientId={composerClientId}
        initialPortalRequest={initialPortalRequest}
        mode={composerMode}
        editingAppointment={editingAppointment}
        onPortalRequestScheduled={onPortalRequestScheduled}
        timezone={timezone}
        currentUser={currentUser}
      />

      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2} fz="lg">Scheduling</Title>
          <Text c="dimmed" fz="sm">
            Calendar management for practice-wide scheduling, counselor calendars, and client appointments.
          </Text>
        </div>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="appointments">Appointments</Tabs.Tab>
          <Tabs.Tab value="waitlist">Waitlist</Tabs.Tab>
          <Tabs.Tab value="reminders">Reminders</Tabs.Tab>
          <Tabs.Tab value="availability">Availability</Tabs.Tab>
          <Tabs.Tab value="recurring">Recurring</Tabs.Tab>
          {['practice_owner', 'practice_admin', 'scheduler_biller'].includes(currentUser?.role) && (
            <Tabs.Tab value="utilization">Utilization</Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="appointments" pt="md">
          <Stack gap="md">
            <Group justify="flex-end">
              <Button variant="default" onClick={loadScheduling}>Refresh</Button>
              <Button onClick={() => {
                setComposerClientId(initialClientId);
                setComposerMode('create');
                setEditingAppointment(null);
                setComposerOpen(true);
              }}>
                New Appointment
              </Button>
            </Group>

            <Paper withBorder radius="md" p="md">
              <Group align="flex-end" gap="sm" wrap="wrap">
                <TextInput
                  label="Day"
                  type="date"
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.currentTarget.value)}
                />
                <Select
                  label="Calendar View"
                  data={canManageAll
                    ? [
                      { value: 'general', label: 'General Calendar' },
                      { value: 'counselor', label: 'Counselor Calendar' },
                      { value: 'practice', label: 'Practice Manager Calendar' },
                    ]
                    : [{ value: 'counselor', label: 'My Calendar' }]}
                  value={view}
                  onChange={(value) => setView(value || (canManageAll ? 'practice' : 'counselor'))}
                  w={240}
                />
                {view === 'counselor' ? (
                  <Select
                    label="Counselor"
                    data={counselorOptions}
                    searchable
                    disabled={!canManageAll}
                    value={selectedCounselorName}
                    onChange={(value) => setSelectedCounselorName(value || '')}
                    w={260}
                  />
                ) : null}
              </Group>
              <Text c="dimmed" fz="sm" mt="sm">{formatDateLabel(selectedDay)}</Text>
            </Paper>

            <SimpleGrid cols={{ base: 2, md: 4 }}>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>Appointments</Text>
                <Text fz="xl" fw={700}>{metrics.total}</Text>
              </Card>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>Scheduled</Text>
                <Text fz="xl" fw={700}>{metrics.scheduled}</Text>
              </Card>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>Remote</Text>
                <Text fz="xl" fw={700}>{metrics.remote}</Text>
              </Card>
              <Card withBorder radius="md" p="md">
                <Text c="dimmed" fz="xs" tt="uppercase" fw={700}>Counselors Active</Text>
                <Text fz="xl" fw={700}>{metrics.counselors}</Text>
              </Card>
            </SimpleGrid>

            {loading ? (
              <Group justify="center" py="xl"><Loader size="sm" /></Group>
            ) : error ? (
              <Alert color="red" title="Unable to load scheduling data">{error}</Alert>
            ) : (
              <>
                {view === 'practice' ? (
                  <PracticeOperationsView
                    calendars={calendarPayload.counselorCalendars}
                    locations={calendarPayload.locationCalendars}
                    timezone={timezone}
                  />
                ) : view === 'counselor' ? (
                  <Stack gap="md">
                    {availabilityNote ? (
                      <Alert color="blue" title="Availability template">
                        {availabilityNote.template?.length
                          ? `Availability slots configured: ${availabilityNote.template.length}`
                          : 'No availability slots configured for this counselor yet.'}
                      </Alert>
                    ) : null}
                    <Paper withBorder radius="md" p="md">
                      <Title order={3} fz="md" mb="sm">Counselor calendar</Title>
                      <CounselorCalendarCards calendars={filteredCounselorCalendars} timezone={timezone} />
                    </Paper>
                  </Stack>
                ) : (
                  <Paper withBorder radius="md" p="md">
                    <Title order={3} fz="md" mb="sm">General calendar</Title>
                    <AppointmentTable
                      appointments={dayAppointments}
                      timezone={timezone}
                      onOpenClient={onOpenClient}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  </Paper>
                )}

                <Divider />

                <Paper withBorder radius="md" p="md">
                  <Title order={3} fz="md" mb="sm">Agenda</Title>
                  <AppointmentTable
                    appointments={dayAppointments}
                    timezone={timezone}
                    onOpenClient={onOpenClient}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                </Paper>
              </>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="waitlist" pt="md">
          <WaitlistPanel onPromote={(clientId) => {
            setComposerClientId(clientId);
            setComposerMode('create');
            setEditingAppointment(null);
            setComposerOpen(true);
            setActiveTab('appointments');
          }} />
        </Tabs.Panel>

        <Tabs.Panel value="reminders" pt="md">
          <RemindersPanel appointments={appointments} />
        </Tabs.Panel>

        <Tabs.Panel value="availability" pt="md">
          <AvailabilityOverridesPanel staff={staff} />
        </Tabs.Panel>

        <Tabs.Panel value="recurring" pt="md">
          <SeriesPanel staff={staff} clients={clients} />
        </Tabs.Panel>

        {['practice_owner', 'practice_admin', 'scheduler_biller'].includes(currentUser?.role) && (
          <Tabs.Panel value="utilization" pt="md">
            <UtilizationPanel />
          </Tabs.Panel>
        )}
      </Tabs>
    </Stack>
  );
}
