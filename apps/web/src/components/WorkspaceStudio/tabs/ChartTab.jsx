import { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Paper, Group, Badge, Switch, Loader, Alert, Divider,
  Table, Button, ActionIcon, Tooltip, TextInput, Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconRefresh } from '@tabler/icons-react';
import { csrfHeaders } from '../../../lib/csrf.js';

const CATEGORY_ORDER = [
  'intake', 'administrative', 'assessment', 'clinical', 'treatment',
  'worksheets', 'faith', 'anxiety', 'depression', 'trauma', 'adhd',
  'substance', 'sleep', 'self', 'relationship', 'grief', 'burnout', 'family',
];

const CATEGORY_LABELS = {
  intake: 'Intake',
  administrative: 'Administrative',
  assessment: 'Assessment',
  clinical: 'Clinical',
  treatment: 'Treatment Planning',
  worksheets: 'Worksheets',
  faith: 'Faith & Spiritual',
  anxiety: 'Anxiety',
  depression: 'Depression',
  trauma: 'Trauma',
  adhd: 'ADHD',
  substance: 'Substance Use',
  sleep: 'Sleep',
  self: 'Self-Esteem',
  relationship: 'Relationship',
  grief: 'Grief',
  burnout: 'Burnout',
  family: 'Family',
};

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export default function ChartTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [toggling, setToggling] = useState({}); // id → true while saving

  function load() {
    setLoading(true);
    setError('');
    apiFetch('/api/v1/forms/catalog?includeInactive=true')
      .then((data) => setItems(Array.isArray(data?.items) ? data.items : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleActive(item) {
    setToggling((prev) => ({ ...prev, [item.id]: true }));
    try {
      const data = await apiFetch('/api/v1/forms/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      setItems((prev) => prev.map((i) => i.id === item.id ? data.item : i));
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setToggling((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
    }
  }

  async function toggleSignup(item) {
    setToggling((prev) => ({ ...prev, [`sig-${item.id}`]: true }));
    try {
      const data = await apiFetch('/api/v1/forms/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ id: item.id, isStandardOnSignup: !item.isStandardOnSignup }),
      });
      setItems((prev) => prev.map((i) => i.id === item.id ? data.item : i));
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setToggling((prev) => { const n = { ...prev }; delete n[`sig-${item.id}`]; return n; });
    }
  }

  const allCategories = [...new Set(items.map((i) => i.category))].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...allCategories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c })),
  ];

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.formKey.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // Group by category in order
  const grouped = allCategories
    .filter((cat) => !categoryFilter || cat === categoryFilter)
    .map((cat) => ({
      cat,
      rows: filtered.filter((i) => i.category === cat),
    }))
    .filter((g) => g.rows.length > 0);

  const activeCount = items.filter((i) => i.isActive).length;
  const signupCount = items.filter((i) => i.isStandardOnSignup).length;

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load form catalog">{error}</Alert>;

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Stack gap="xs" mb="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={3} fz="md">Clinical Form &amp; Instrument Catalog</Title>
              <Text fz="sm" c="dimmed">
                Control which assessments, worksheets, and forms are available for this practice.
                Forms marked <strong>Standard on Signup</strong> are automatically included in new
                client intake packets.
              </Text>
            </div>
            <Tooltip label="Refresh">
              <ActionIcon variant="subtle" onClick={load}><IconRefresh size={16} /></ActionIcon>
            </Tooltip>
          </Group>
          <Group gap="sm">
            <Badge variant="light" color="teal">{activeCount} active</Badge>
            <Badge variant="light" color="blue">{signupCount} on signup</Badge>
            <Badge variant="light" color="gray">{items.length} total</Badge>
          </Group>
        </Stack>
        <Divider mb="md" />
        <Group mb="md" gap="sm">
          <TextInput
            placeholder="Search by name or key…"
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            data={categoryOptions}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v ?? '')}
            placeholder="All Categories"
            style={{ width: 220 }}
            clearable
          />
        </Group>

        {grouped.length === 0 && (
          <Text c="dimmed" fz="sm" ta="center" py="xl">No forms match the current filter.</Text>
        )}

        {grouped.map(({ cat, rows }) => (
          <div key={cat}>
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed" mb="xs" mt="sm">
              {CATEGORY_LABELS[cat] ?? cat}
            </Text>
            <Table striped highlightOnHover withTableBorder withColumnBorders fz="sm" mb="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Form / Instrument</Table.Th>
                  <Table.Th style={{ width: 90 }}>Active</Table.Th>
                  <Table.Th style={{ width: 130 }}>Standard on Signup</Table.Th>
                  <Table.Th style={{ width: 80 }}>Version</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((item) => (
                  <Table.Tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                    <Table.Td>
                      <Text fz="sm" fw={500}>{item.title}</Text>
                      <Text fz="xs" c="dimmed">{item.formKey}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        checked={item.isActive}
                        onChange={() => toggleActive(item)}
                        disabled={!!toggling[item.id]}
                        size="sm"
                        aria-label={`Toggle ${item.title} active`}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        checked={item.isStandardOnSignup}
                        onChange={() => toggleSignup(item)}
                        disabled={!!toggling[`sig-${item.id}`] || !item.isActive}
                        size="sm"
                        color="blue"
                        aria-label={`Toggle ${item.title} standard on signup`}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" variant="outline">v{item.versionNumber ?? 1}</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        ))}
      </Paper>
    </Stack>
  );
}
