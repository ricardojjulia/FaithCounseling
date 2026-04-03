import { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  Paper, Group, Stack, Title, Text, Button, Badge, Modal,
  Select, TextInput, Checkbox, SimpleGrid, Loader,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  fetchStaffLicenses, createStaffLicense, updateStaffLicense, deleteStaffLicense,
} from '../../../lib/clientApi.js';

const LICENSE_TYPE_OPTIONS = [
  { value: 'lmft',               label: 'LMFT' },
  { value: 'lpc',                label: 'LPC' },
  { value: 'lcsw',               label: 'LCSW' },
  { value: 'psychologist',       label: 'Psychologist' },
  { value: 'pastoral_counselor', label: 'Pastoral Counselor' },
  { value: 'ordained_minister',  label: 'Ordained Minister' },
  { value: 'chaplain',           label: 'Chaplain' },
  { value: 'intern',             label: 'Intern' },
  { value: 'other',              label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active',          label: 'Active' },
  { value: 'expired',         label: 'Expired' },
  { value: 'inactive',        label: 'Inactive' },
  { value: 'pending_renewal', label: 'Pending Renewal' },
];

const STATUS_COLOR = { active: 'green', expired: 'red', inactive: 'gray', pending_renewal: 'yellow' };

function dateToStr(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null; }

export default function LicensesTab({ staffId, currentUser }) {
  const isAdmin = ['platform_admin', 'practice_owner', 'practice_admin'].includes(currentUser?.role);

  const [licenses,  setLicenses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const form = useForm({
    initialValues: {
      licenseType: 'lpc', licenseNumber: '', issuingState: '', issuingBody: '',
      issueDate: null, expiryDate: null, status: 'active', isPrimary: false,
    },
    validate: { licenseType: (v) => v ? null : 'License type is required' },
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStaffLicenses(staffId)
      .then((d) => { if (!cancelled) { setLicenses(d.items ?? []); setLoading(false); } })
      .catch((err) => { if (!cancelled) { notifications.show({ title: 'Error', message: err.message, color: 'red' }); setLoading(false); } });
    return () => { cancelled = true; };
  }, [staffId]);

  function openAdd() {
    form.reset();
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(lic) {
    form.setValues({
      licenseType:   lic.licenseType   ?? 'lpc',
      licenseNumber: lic.licenseNumber ?? '',
      issuingState:  lic.issuingState  ?? '',
      issuingBody:   lic.issuingBody   ?? '',
      issueDate:     lic.issueDate     || null,
      expiryDate:    lic.expiryDate    || null,
      status:        lic.status        ?? 'active',
      isPrimary:     Boolean(lic.isPrimary),
    });
    setEditingId(lic.id);
    setModalOpen(true);
  }

  const handleSave = async (values) => {
    const payload = {
      ...values,
      issueDate:  dateToStr(values.issueDate),
      expiryDate: dateToStr(values.expiryDate),
      licenseNumber: values.licenseNumber || null,
      issuingState:  values.issuingState  || null,
      issuingBody:   values.issuingBody   || null,
    };
    try {
      if (editingId) {
        const data = await updateStaffLicense(staffId, editingId, payload);
        setLicenses((prev) => prev.map((l) => l.id === editingId ? data.item : l));
      } else {
        const data = await createStaffLicense(staffId, payload);
        setLicenses((prev) => [...prev, data.item]);
      }
      setModalOpen(false);
      notifications.show({ title: 'Saved', message: 'License saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleDelete = async (licId) => {
    if (!window.confirm('Delete this license?')) return;
    try {
      await deleteStaffLicense(staffId, licId);
      setLicenses((prev) => prev.filter((l) => l.id !== licId));
      notifications.show({ title: 'Deleted', message: 'License removed.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;

  return (
    <Stack gap="md" maw={800}>
      <Group justify="space-between">
        <Title order={4}>Licenses & Credentials</Title>
        {isAdmin && <Button size="xs" onClick={openAdd}>+ Add License</Button>}
      </Group>

      {licenses.length === 0 && (
        <Text c="dimmed" fz="sm">No licenses on file.{isAdmin && ' Click "+ Add License" to add one.'}</Text>
      )}

      {licenses.map((lic) => (
        <Paper key={lic.id} withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Group gap="xs">
                <Text fw={600} fz="sm">{lic.licenseType?.toUpperCase()}</Text>
                {lic.isPrimary && <Badge size="xs" color="blue" variant="light">Primary</Badge>}
                <Badge size="xs" color={STATUS_COLOR[lic.status] ?? 'gray'} variant="light">{lic.status}</Badge>
              </Group>
              {lic.licenseNumber && <Text fz="xs" c="dimmed">License #: {lic.licenseNumber}</Text>}
              {lic.issuingState  && <Text fz="xs" c="dimmed">State: {lic.issuingState}</Text>}
              {lic.issuingBody   && <Text fz="xs" c="dimmed">Body: {lic.issuingBody}</Text>}
              {lic.expiryDate    && <Text fz="xs" c="dimmed">Expires: {lic.expiryDate?.slice(0, 10)}</Text>}
            </Stack>
            {isAdmin && (
              <Group gap="xs">
                <Button size="xs" variant="default" onClick={() => openEdit(lic)}>Edit</Button>
                <Button size="xs" color="red" variant="light" onClick={() => handleDelete(lic.id)}>Delete</Button>
              </Group>
            )}
          </Group>
        </Paper>
      ))}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit License' : 'Add License'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="sm">
            <SimpleGrid cols={2} spacing="sm">
              <Select label="License Type" required data={LICENSE_TYPE_OPTIONS} {...form.getInputProps('licenseType')} />
              <TextInput label="License Number" {...form.getInputProps('licenseNumber')} />
              <TextInput label="Issuing State / Region" placeholder="e.g. TX, CA" {...form.getInputProps('issuingState')} />
              <TextInput label="Issuing Body" {...form.getInputProps('issuingBody')} />
              <DateInput label="Issue Date"  valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" {...form.getInputProps('issueDate')} />
              <DateInput label="Expiry Date" valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" {...form.getInputProps('expiryDate')} />
              <Select label="Status" data={STATUS_OPTIONS} {...form.getInputProps('status')} />
              <Checkbox label="Primary License" mt="xl" {...form.getInputProps('isPrimary', { type: 'checkbox' })} />
            </SimpleGrid>
            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={form.submitting}>Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
