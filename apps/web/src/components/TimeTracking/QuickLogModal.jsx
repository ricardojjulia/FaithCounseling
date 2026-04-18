import { useState } from 'react';
import { Modal, Stack, Select, TextInput, Textarea, Button, Group, Text } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../../lib/csrf.js';

const CATEGORY_OPTIONS = [
  { value: 'direct_clinical',          label: 'Direct Clinical' },
  { value: 'indirect_admin',           label: 'Indirect / Administrative' },
  { value: 'supervision_individual',   label: 'Individual Supervision' },
  { value: 'supervision_group',        label: 'Group Supervision' },
  { value: 'ce_spiritual',             label: 'Continuing Education / Spiritual Formation' },
  { value: 'ministry_coordination',    label: 'Ministry Coordination' },
];

export default function QuickLogModal({ opened, onClose, onCreated }) {
  const [category, setCategory] = useState('direct_clinical');
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCategory('direct_clinical');
    setStartTime(null);
    setEndTime(null);
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      notifications.show({ title: 'Required', message: 'Start and end time are required.', color: 'yellow' });
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      notifications.show({ title: 'Invalid', message: 'End time must be after start time.', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/time-entries', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({
          category,
          startTime: startTime instanceof Date ? startTime.toISOString() : startTime,
          endTime: endTime instanceof Date ? endTime.toISOString() : endTime,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }
      const { item } = await res.json();
      notifications.show({ title: 'Logged', message: `${item.durationMinutes} min recorded.`, color: 'green' });
      reset();
      onCreated?.(item);
      onClose();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Quick Log Time" size="md" centered>
      <Stack gap="sm">
        <Select
          label="Category"
          data={CATEGORY_OPTIONS}
          value={category}
          onChange={(v) => setCategory(v ?? 'direct_clinical')}
          required
        />
        <DateTimePicker
          label="Start Time"
          placeholder="Pick start date/time"
          value={startTime}
          onChange={setStartTime}
          required
          clearable
        />
        <DateTimePicker
          label="End Time"
          placeholder="Pick end date/time"
          value={endTime}
          onChange={setEndTime}
          required
          clearable
        />
        {startTime && endTime && new Date(endTime) > new Date(startTime) && (
          <Text size="sm" c="dimmed">
            Duration: {Math.round((new Date(endTime) - new Date(startTime)) / 60000)} min
          </Text>
        )}
        <Textarea
          label="Notes (optional)"
          placeholder="Brief description — not visible in telemetry"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={2}
          autosize
          maxLength={2000}
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>Log Time</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
