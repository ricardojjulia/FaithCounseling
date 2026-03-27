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
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  createAppointmentRecord,
  deleteAppointmentRecord,
  fetchAppointments,
  fetchAppointmentTypes,
  fetchSchedulingCalendar,
  fetchStaff,
  updateAppointmentRecord,
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
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [view, setView] = useState(initialView || (canManageAll ? 'practice' : 'counselor'));
  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [composerMode, setComposerMode] = useState('create');
  const [editingAppointment, setEditingAppointment] = useState(null);
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
    try {
      await updateAppointmentRecord(appointment.id, { status });
      notifications.show({
        title: 'Appointment updated',
        message: `Appointment marked ${status}.`,
        color: 'green',
      });
      await loadScheduling();
    } catch (updateError) {
      notifications.show({
        title: 'Unable to update appointment',
        message: updateError.message || 'Status change failed.',
        color: 'red',
      });
    }
  };

  const handleDelete = async (appointment) => {
    if (!window.confirm(`Delete appointment for ${appointment.clientName}?`)) return;
    try {
      await deleteAppointmentRecord(appointment.id);
      notifications.show({
        title: 'Appointment deleted',
        message: 'The appointment was removed.',
        color: 'green',
      });
      await loadScheduling();
    } catch (deleteError) {
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
    staff.filter((item) => COUNSELING_ROLES.has(item.role) || GLOBAL_SCHEDULING_ROLES.has(item.role))
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

  return (
    <Stack gap="md" p="md">
      <AppointmentComposer
        opened={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setComposerMode('create');
          setEditingAppointment(null);
          onComposerHandled?.();
        }}
        onCreated={loadScheduling}
        clients={clients}
        counselors={counselors}
        appointmentTypes={appointmentTypes}
        initialClientId={initialClientId}
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
        <Group>
          <Button variant="default" onClick={loadScheduling}>Refresh</Button>
          <Button onClick={() => {
            setComposerMode('create');
            setEditingAppointment(null);
            setComposerOpen(true);
          }}>
            New Appointment
          </Button>
        </Group>
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
  );
}