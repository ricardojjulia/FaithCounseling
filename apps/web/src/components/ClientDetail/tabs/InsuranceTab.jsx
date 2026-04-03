import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { Stack, Title, Paper, SimpleGrid, TextInput, Select, Checkbox, Button, Group, Text, Divider, NumberInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { createClientInsurance, updateClientInsurance, createReferringProvider, updateReferringProvider } from '../../../lib/clientApi.js';

function dateToStr(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null; }

function InsuranceCard({ title, initialData, clientId, coverageOrder }) {
  const [selfPay,   setSelfPay]   = useState(initialData?.self_pay ?? false);
  const [collapsed, setCollapsed] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({
    id:                   initialData?.id                   ?? null,
    carrier_name:         initialData?.carrier_name         ?? '',
    plan_name:            initialData?.plan_name            ?? '',
    member_id:            initialData?.member_id            ?? '',
    group_number:         initialData?.group_number         ?? '',
    subscriber_name:      initialData?.subscriber_name      ?? '',
    subscriber_dob:       initialData?.subscriber_dob       || null,
    subscriber_rel:       initialData?.subscriber_rel       ?? 'self',
    auth_number:          initialData?.auth_number          ?? '',
    auth_visits_approved: initialData?.auth_visits_approved ?? null,
    auth_expires_on:      initialData?.auth_expires_on      || null,
    referral_number:      initialData?.referral_number      ?? '',
    copay_dollars:        initialData?.copay_cents != null ? initialData.copay_cents / 100 : null,
    effective_from:       initialData?.effective_from       || null,
    effective_to:         initialData?.effective_to         || null,
    is_active:            initialData?.is_active ?? true,
    verified_on:          initialData?.verified_on          || null,
    verified_by:          initialData?.verified_by          ?? '',
  });

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        coverage_order:       coverageOrder,
        carrier_name:         form.carrier_name.trim(),
        plan_name:            form.plan_name.trim()         || null,
        member_id:            form.member_id.trim(),
        group_number:         form.group_number.trim()      || null,
        subscriber_name:      form.subscriber_name.trim()   || null,
        subscriber_dob:       dateToStr(form.subscriber_dob),
        subscriber_rel:       form.subscriber_rel           || null,
        auth_number:          form.auth_number.trim()       || null,
        auth_visits_approved: form.auth_visits_approved     ?? null,
        auth_expires_on:      dateToStr(form.auth_expires_on),
        referral_number:      form.referral_number.trim()   || null,
        copay_cents:          form.copay_dollars != null ? Math.round(form.copay_dollars * 100) : null,
        effective_from:       dateToStr(form.effective_from),
        effective_to:         dateToStr(form.effective_to),
        is_active:            form.is_active ? 1 : 0,
        verified_on:          dateToStr(form.verified_on),
        verified_by:          form.verified_by.trim()       || null,
      };
      const result = form.id ? await updateClientInsurance(clientId, form.id, data) : await createClientInsurance(clientId, data);
      const saved = result.item ?? result;
      setForm((f) => ({ ...f, id: saved.id }));
      notifications.show({ title: 'Saved', message: `${title} saved.`, color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  return (
    <Paper withBorder radius="md" overflow="hidden">
      <Group
        justify="space-between"
        p="sm"
        style={{ background: 'var(--mantine-color-gray-0)', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid var(--mantine-color-default-border)' }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <Text fw={600} fz="sm">{title}</Text>
        <Text fz="xs" c="dimmed">{collapsed ? '+ Expand' : '− Collapse'}</Text>
      </Group>
      {!collapsed && (
        <Stack p="md" gap="sm">
          <Checkbox label="No Insurance / Self-Pay" checked={selfPay} onChange={(e) => { setSelfPay(e.currentTarget.checked); if (e.currentTarget.checked) setCollapsed(true); }} />
          {!selfPay && (
            <>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput label="Carrier Name"  value={form.carrier_name}  onChange={(e) => set('carrier_name',  e.target.value)} />
                <TextInput label="Plan Name"     value={form.plan_name}     onChange={(e) => set('plan_name',     e.target.value)} />
                <TextInput label="Member ID"     value={form.member_id}     onChange={(e) => set('member_id',     e.target.value)} />
                <TextInput label="Group Number"  value={form.group_number}  onChange={(e) => set('group_number',  e.target.value)} />
              </SimpleGrid>

              <Divider label="Subscriber" labelPosition="left" />
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <TextInput label="Subscriber Name"    value={form.subscriber_name} onChange={(e) => set('subscriber_name', e.target.value)} />
                <DateInput label="Subscriber DOB" valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.subscriber_dob} onChange={(v) => set('subscriber_dob', v)} />
                <Select label="Relationship to Client" data={[{ value: 'self', label: 'Self' }, { value: 'spouse', label: 'Spouse' }, { value: 'child', label: 'Child' }, { value: 'other', label: 'Other' }]} value={form.subscriber_rel} onChange={(v) => set('subscriber_rel', v)} />
              </SimpleGrid>

              <Divider label="Authorization & Billing" labelPosition="left" />
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <TextInput    label="Authorization #"   value={form.auth_number}     onChange={(e) => set('auth_number', e.target.value)} />
                <NumberInput  label="Authorized Visits" value={form.auth_visits_approved ?? ''} onChange={(v) => set('auth_visits_approved', v === '' ? null : v)} min={0} />
                <DateInput    label="Auth Expiration"   valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.auth_expires_on} onChange={(v) => set('auth_expires_on', v)} />
                <TextInput    label="Referral #"        value={form.referral_number} onChange={(e) => set('referral_number', e.target.value)} />
                <NumberInput  label="Copay ($)"         value={form.copay_dollars ?? ''} onChange={(v) => set('copay_dollars', v === '' ? null : v)} min={0} step={0.01} decimalScale={2} />
              </SimpleGrid>

              <Divider label="Coverage Period" labelPosition="left" />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <DateInput label="Effective From" valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.effective_from} onChange={(v) => set('effective_from', v)} />
                <DateInput label="Effective To"   valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.effective_to}   onChange={(v) => set('effective_to',   v)} />
                <DateInput label="Verified On"    valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.verified_on}    onChange={(v) => set('verified_on',    v)} />
                <TextInput label="Verified By"    value={form.verified_by} onChange={(e) => set('verified_by', e.target.value)} />
              </SimpleGrid>

              <Checkbox label="Coverage is currently active" checked={!!form.is_active} onChange={(e) => set('is_active', e.currentTarget.checked)} />
              <Group><Button size="xs" loading={saving} onClick={handleSave}>Save {title}</Button></Group>
            </>
          )}
        </Stack>
      )}
    </Paper>
  );
}

function ReferringProviderSection({ clientId, initialProvider }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id:             initialProvider?.id             ?? null,
    provider_name:  initialProvider?.provider_name  ?? '',
    practice_name:  initialProvider?.practice_name  ?? '',
    npi:            initialProvider?.npi            ?? '',
    phone:          initialProvider?.phone          ?? '',
    fax:            initialProvider?.fax            ?? '',
    address_line1:  initialProvider?.address?.line1  ?? '',
    address_city:   initialProvider?.address?.city   ?? '',
    address_state:  initialProvider?.address?.state  ?? '',
    address_postal: initialProvider?.address?.postal ?? '',
    referral_date:  initialProvider?.referral_date  || null,
    referral_notes: initialProvider?.referral_notes  ?? '',
  });

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (form.npi && !/^\d{10}$/.test(form.npi)) {
      notifications.show({ title: 'Validation', message: 'NPI must be exactly 10 digits.', color: 'yellow' });
      return;
    }
    setSaving(true);
    try {
      const data = {
        provider_name:  form.provider_name.trim(),
        practice_name:  form.practice_name.trim()  || null,
        npi:            form.npi.trim()            || null,
        phone:          form.phone.trim()          || null,
        fax:            form.fax.trim()            || null,
        address: { line1: form.address_line1.trim(), city: form.address_city.trim(), state: form.address_state.trim(), postal: form.address_postal.trim() },
        referral_date:  dateToStr(form.referral_date),
        referral_notes: form.referral_notes.trim() || null,
      };
      const result = form.id ? await updateReferringProvider(clientId, form.id, data) : await createReferringProvider(clientId, data);
      const saved = result.item ?? result;
      setForm((f) => ({ ...f, id: saved.id }));
      notifications.show({ title: 'Saved', message: 'Referring provider saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  return (
    <Stack gap="sm">
      <Title order={4} fz="sm" tt="uppercase" c="dimmed">Referring Provider</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput label="Provider Full Name"       value={form.provider_name}  onChange={(e) => set('provider_name',  e.target.value)} />
        <TextInput label="Practice / Organization"  value={form.practice_name}  onChange={(e) => set('practice_name',  e.target.value)} />
        <TextInput label="NPI (10 digits)"          value={form.npi}            maxLength={10} onChange={(e) => set('npi', e.target.value)} placeholder="1234567890" />
        <TextInput label="Direct Phone" type="tel"  value={form.phone}          onChange={(e) => set('phone', e.target.value)} />
        <TextInput label="Fax"          type="tel"  value={form.fax}            onChange={(e) => set('fax',   e.target.value)} />
        <DateInput label="Referral Date" valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={form.referral_date} onChange={(v) => set('referral_date', v)} />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput label="Address Line 1" value={form.address_line1}  onChange={(e) => set('address_line1',  e.target.value)} />
        <TextInput label="City"           value={form.address_city}   onChange={(e) => set('address_city',   e.target.value)} />
        <TextInput label="State"          value={form.address_state}  onChange={(e) => set('address_state',  e.target.value)} maxLength={64} />
        <TextInput label="ZIP"            value={form.address_postal} onChange={(e) => set('address_postal', e.target.value)} />
      </SimpleGrid>
      <TextInput label="Referral Notes" value={form.referral_notes} onChange={(e) => set('referral_notes', e.target.value)} />
      <Group><Button size="xs" loading={saving} onClick={handleSave}>Save Referring Provider</Button></Group>
    </Stack>
  );
}

export default function InsuranceTab({ client, clientId }) {
  const insurance  = client.insurance ?? [];
  const primaryData   = insurance.find((i) => i.coverage_order === 'primary')   ?? null;
  const secondaryData = insurance.find((i) => i.coverage_order === 'secondary') ?? null;
  const referring     = (client.referring ?? [])[0] ?? null;

  return (
    <Stack gap="lg" maw={900}>
      <InsuranceCard title="Primary Insurance"   coverageOrder="primary"   initialData={primaryData}   clientId={clientId} />
      <InsuranceCard title="Secondary Coverage"  coverageOrder="secondary" initialData={secondaryData} clientId={clientId} />
      <Divider />
      <ReferringProviderSection clientId={clientId} initialProvider={referring} />
    </Stack>
  );
}
