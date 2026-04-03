import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import {
  Stack, Title, Select, TextInput, Button, Group,
  SimpleGrid, Loader, Text, Paper,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { fetchStaffEmployment, upsertStaffEmployment } from '../../../lib/clientApi.js';

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time',  label: 'Full-Time' },
  { value: 'part_time',  label: 'Part-Time' },
  { value: 'contractor', label: 'Contractor / 1099' },
  { value: 'intern',     label: 'Intern' },
  { value: 'volunteer',  label: 'Volunteer' },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'active',     label: 'Active' },
  { value: 'on_leave',   label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
];

function dateToStr(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null; }

const EMPTY = {
  employmentType: 'full_time', employmentStatus: 'active',
  hireDate: null, terminationDate: null, npiNumber: '',
  malpracticeInsurer: '', malpracticePolicy: '', malpracticeExpiry: null, directPhone: '',
};

export default function EmploymentTab({ staffId, currentUser }) {
  const isAdmin = ['platform_admin', 'practice_owner', 'practice_admin'].includes(currentUser?.role);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStaffEmployment(staffId)
      .then((data) => {
        if (cancelled) return;
        const p = data.item ?? {};
        setForm({
          employmentType:     p.employmentType     ?? 'full_time',
          employmentStatus:   p.employmentStatus   ?? 'active',
          hireDate:           p.hireDate           || null,
          terminationDate:    p.terminationDate    || null,
          npiNumber:          p.npiNumber          ?? '',
          malpracticeInsurer: p.malpracticeInsurer ?? '',
          malpracticePolicy:  p.malpracticePolicy  ?? '',
          malpracticeExpiry:  p.malpracticeExpiry  || null,
          directPhone:        p.directPhone        ?? '',
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          notifications.show({ title: 'Error', message: err.message, color: 'red' });
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [staffId]);

  function set(field, val) { setForm((f) => ({ ...f, [field]: val })); }

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.npiNumber && !/^\d{10}$/.test(form.npiNumber)) {
      notifications.show({ title: 'Validation', message: 'NPI must be exactly 10 digits.', color: 'yellow' });
      return;
    }
    setSaving(true);
    try {
      await upsertStaffEmployment(staffId, {
        ...form,
        hireDate:          dateToStr(form.hireDate),
        terminationDate:   dateToStr(form.terminationDate),
        malpracticeExpiry: dateToStr(form.malpracticeExpiry),
        npiNumber:         form.npiNumber         || null,
        malpracticeInsurer: form.malpracticeInsurer || null,
        malpracticePolicy: form.malpracticePolicy  || null,
        directPhone:       form.directPhone        || null,
      });
      notifications.show({ title: 'Saved', message: 'Employment details saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;

  if (!isAdmin) {
    return (
      <Stack gap="sm" maw={500}>
        <Title order={4}>Employment Details</Title>
        <Paper withBorder radius="md" p="md">
          <SimpleGrid cols={2} spacing="xs">
            <Text fz="sm" c="dimmed">Employment Type</Text>  <Text fz="sm">{form.employmentType}</Text>
            <Text fz="sm" c="dimmed">Status</Text>            <Text fz="sm">{form.employmentStatus}</Text>
            <Text fz="sm" c="dimmed">Hire Date</Text>         <Text fz="sm">{form.hireDate ? dateToStr(form.hireDate) : '—'}</Text>
          </SimpleGrid>
          <Text fz="xs" c="dimmed" mt="sm">Sensitive employment fields are visible to administrators only.</Text>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" maw={800}>
      <form onSubmit={handleSave}>
        <Stack gap="lg">
          <Stack gap="sm">
            <Title order={4} fz="sm" tt="uppercase" c="dimmed">Employment Status</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select label="Employment Type"   data={EMPLOYMENT_TYPE_OPTIONS}   value={form.employmentType}   onChange={(v) => set('employmentType', v)} />
              <Select label="Employment Status" data={EMPLOYMENT_STATUS_OPTIONS} value={form.employmentStatus} onChange={(v) => set('employmentStatus', v)} />
              <DateInput label="Hire Date"        valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.hireDate}       onChange={(v) => set('hireDate', v)} />
              <DateInput label="Termination Date" valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.terminationDate} onChange={(v) => set('terminationDate', v)} />
            </SimpleGrid>
          </Stack>

          <Stack gap="sm">
            <Title order={4} fz="sm" tt="uppercase" c="dimmed">Provider Identification</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="NPI Number"
                placeholder="10-digit NPI"
                maxLength={10}
                value={form.npiNumber}
                onChange={(e) => set('npiNumber', e.target.value.replace(/\D/g, ''))}
              />
              <TextInput label="Direct Phone" type="tel" value={form.directPhone} onChange={(e) => set('directPhone', e.target.value)} />
            </SimpleGrid>
          </Stack>

          <Stack gap="sm">
            <Title order={4} fz="sm" tt="uppercase" c="dimmed">Malpractice Insurance</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput label="Insurance Provider" value={form.malpracticeInsurer} onChange={(e) => set('malpracticeInsurer', e.target.value)} />
              <TextInput label="Policy Number"      value={form.malpracticePolicy}  onChange={(e) => set('malpracticePolicy',  e.target.value)} />
              <DateInput label="Policy Expiry Date" valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.malpracticeExpiry} onChange={(v) => set('malpracticeExpiry', v)} />
            </SimpleGrid>
          </Stack>

          <Group>
            <Button type="submit" loading={saving}>Save Employment Details</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
