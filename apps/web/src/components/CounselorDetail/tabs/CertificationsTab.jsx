import { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  Paper, Group, Stack, Title, Text, Button, Badge, Modal,
  TextInput, Checkbox, Textarea, NumberInput, SimpleGrid, Loader,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  fetchStaffCertifications, createStaffCertification,
  updateStaffCertification, deleteStaffCertification,
} from '../../../lib/clientApi.js';

function dateToStr(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
function strToDate(s) { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; }

function CertCard({ cert, isAdmin, onEdit, onDelete }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <Text fw={600} fz="sm">{cert.certName}</Text>
            <Badge size="xs" color={cert.isCeu ? 'yellow' : 'blue'} variant="light">
              {cert.isCeu ? `CEU — ${cert.ceuHours ?? 0} hrs` : 'Certification'}
            </Badge>
          </Group>
          {cert.issuingBody  && <Text fz="xs" c="dimmed">{cert.issuingBody}</Text>}
          {cert.certNumber   && <Text fz="xs" c="dimmed">Cert #: {cert.certNumber}</Text>}
          {cert.issueDate    && <Text fz="xs" c="dimmed">Issued: {cert.issueDate?.slice(0, 10)}</Text>}
          {cert.expiryDate   && <Text fz="xs" c="dimmed">Expires: {cert.expiryDate?.slice(0, 10)}</Text>}
          {cert.notes        && <Text fz="xs">{cert.notes}</Text>}
        </Stack>
        {isAdmin && (
          <Group gap="xs">
            <Button size="xs" variant="default" onClick={() => onEdit(cert)}>Edit</Button>
            <Button size="xs" color="red" variant="light" onClick={() => onDelete(cert.id)}>Delete</Button>
          </Group>
        )}
      </Group>
    </Paper>
  );
}

export default function CertificationsTab({ staffId, currentUser }) {
  const isAdmin = ['platform_admin', 'practice_owner', 'practice_admin'].includes(currentUser?.role);

  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const form = useForm({
    initialValues: {
      certName: '', issuingBody: '', issueDate: null, expiryDate: null,
      certNumber: '', isCeu: false, ceuHours: null, notes: '',
    },
    validate: { certName: (v) => v.trim() ? null : 'Name is required' },
  });

  const isCeu = form.values.isCeu;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStaffCertifications(staffId)
      .then((d) => { if (!cancelled) { setItems(d.items ?? []); setLoading(false); } })
      .catch((err) => { if (!cancelled) { notifications.show({ title: 'Error', message: err.message, color: 'red' }); setLoading(false); } });
    return () => { cancelled = true; };
  }, [staffId]);

  function openAdd() { form.reset(); setEditingId(null); setModalOpen(true); }

  function openEdit(cert) {
    form.setValues({
      certName:    cert.certName    ?? '',
      issuingBody: cert.issuingBody ?? '',
      issueDate:   cert.issueDate   || null,
      expiryDate:  cert.expiryDate  || null,
      certNumber:  cert.certNumber  ?? '',
      isCeu:       Boolean(cert.isCeu),
      ceuHours:    cert.ceuHours    ?? null,
      notes:       cert.notes       ?? '',
    });
    setEditingId(cert.id);
    setModalOpen(true);
  }

  const handleSave = async (values) => {
    const payload = {
      certName:    values.certName,
      issuingBody: values.issuingBody  || null,
      issueDate:   dateToStr(values.issueDate),
      expiryDate:  dateToStr(values.expiryDate),
      certNumber:  values.certNumber   || null,
      isCeu:       values.isCeu,
      ceuHours:    values.isCeu && values.ceuHours != null ? Number(values.ceuHours) : null,
      notes:       values.notes || null,
    };
    try {
      if (editingId) {
        const data = await updateStaffCertification(staffId, editingId, payload);
        setItems((prev) => prev.map((c) => c.id === editingId ? data.item : c));
      } else {
        const data = await createStaffCertification(staffId, payload);
        setItems((prev) => [...prev, data.item]);
      }
      setModalOpen(false);
      notifications.show({ title: 'Saved', message: 'Record saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await deleteStaffCertification(staffId, id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      notifications.show({ title: 'Deleted', message: 'Record removed.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;

  const certs = items.filter((i) => !i.isCeu);
  const ceus  = items.filter((i) => i.isCeu);

  return (
    <Stack gap="md" maw={800}>
      <Group justify="space-between">
        <Title order={4}>Certifications & CEUs</Title>
        {isAdmin && <Button size="xs" onClick={openAdd}>+ Add Record</Button>}
      </Group>

      <Stack gap="xs">
        <Title order={5} fz="sm" c="dimmed">Certifications ({certs.length})</Title>
        {certs.length === 0
          ? <Text c="dimmed" fz="sm">No certifications on file.</Text>
          : certs.map((c) => <CertCard key={c.id} cert={c} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />)
        }
      </Stack>

      <Stack gap="xs">
        <Title order={5} fz="sm" c="dimmed">CEU Log ({ceus.length} records)</Title>
        {ceus.length === 0
          ? <Text c="dimmed" fz="sm">No CEU records on file.</Text>
          : ceus.map((c) => <CertCard key={c.id} cert={c} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />)
        }
        {ceus.length > 0 && (
          <Text fz="xs" c="dimmed">
            Total CEU hours: {ceus.reduce((sum, c) => sum + (c.ceuHours ?? 0), 0).toFixed(1)}
          </Text>
        )}
      </Stack>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Record' : 'Add Record'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="sm">
            <Checkbox
              label="This is a CEU record (not a named certification)"
              {...form.getInputProps('isCeu', { type: 'checkbox' })}
            />
            <SimpleGrid cols={isCeu ? 2 : 1} spacing="sm">
              <TextInput
                label={isCeu ? 'CEU Course / Training Name' : 'Certification Name'}
                required
                {...form.getInputProps('certName')}
              />
              {isCeu && (
                <NumberInput label="CEU Hours" step={0.5} min={0} {...form.getInputProps('ceuHours')} />
              )}
            </SimpleGrid>
            <SimpleGrid cols={2} spacing="sm">
              <TextInput label="Issuing Body / Provider" {...form.getInputProps('issuingBody')} />
              {!isCeu && <TextInput label="Certification Number" {...form.getInputProps('certNumber')} />}
              <DateInput label="Issue Date"  valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" {...form.getInputProps('issueDate')} />
              {!isCeu && <DateInput label="Expiry Date" valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" {...form.getInputProps('expiryDate')} />}
            </SimpleGrid>
            <Textarea label="Notes" rows={2} {...form.getInputProps('notes')} />
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
