import { useForm } from '@mantine/form';
import { TextInput, Select, Button, Group, Stack, Alert, Checkbox } from '@mantine/core';
import { csrfHeaders } from '../lib/csrf.js';
import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'active',     label: 'Active' },
  { value: 'waitlist',   label: 'Waitlist' },
  { value: 'inactive',   label: 'Inactive' },
  { value: 'discharged', label: 'Discharged' },
];

export default function ClientForm({ onSubmit, onCancel, initialClient = null }) {
  const [error, setError] = useState(null);

  const form = useForm({
    initialValues: {
      firstName:       initialClient?.firstName       ?? '',
      lastName:        initialClient?.lastName        ?? '',
      faithBackground: initialClient?.faithBackground ?? 'Undeclared',
      status:          initialClient?.status          ?? 'active',
      highTouchpoint:  initialClient?.highTouchpoint  ?? false,
    },
    validate: {
      firstName: (v) => v.trim() ? null : 'First name is required',
      lastName:  (v) => v.trim() ? null : 'Last name is required',
    },
  });

  const handleSubmit = async (values) => {
    setError(null);
    try {
      const payload = {
        firstName:       values.firstName.trim(),
        lastName:        values.lastName.trim(),
        faithBackground: values.faithBackground.trim() || 'Undeclared',
        status:          values.status,
        highTouchpoint:  Boolean(values.highTouchpoint),
      };

      const url    = initialClient ? `/api/v1/clients/${initialClient.id}` : '/api/v1/clients';
      const method = initialClient ? 'PATCH' : 'POST';

      const res = await fetch(url, { method, headers: csrfHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save client');
      }

      const result = await res.json();
      onSubmit(result.item || result);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <TextInput label="First name" required {...form.getInputProps('firstName')} />
        <TextInput label="Last name"  required {...form.getInputProps('lastName')} />
        <TextInput label="Faith background" placeholder="e.g., Evangelical, Catholic…" {...form.getInputProps('faithBackground')} />
        <Select    label="Status" data={STATUS_OPTIONS} {...form.getInputProps('status')} />
        <Checkbox
          label="High touchpoint"
          description="Flag this client for closer follow-up — they'll appear in the Needs Attention panel on the dashboard."
          checked={Boolean(form.values.highTouchpoint)}
          onChange={(event) => form.setFieldValue('highTouchpoint', event.currentTarget.checked)}
        />

        {error && <Alert color="red" variant="light">{error}</Alert>}

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onCancel} disabled={form.submitting}>Cancel</Button>
          <Button type="submit" loading={form.submitting}>
            {initialClient ? 'Update Client' : 'Create Client'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
