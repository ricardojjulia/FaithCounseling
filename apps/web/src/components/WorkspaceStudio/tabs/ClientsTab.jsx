import { useState, useEffect } from 'react';
import {
  Stack, Text, Group, Badge,
  Table, TextInput, Select, SimpleGrid, Divider, ActionIcon, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ExternalLink, RefreshCw, Search, Users } from 'lucide-react';
import { useI18n } from '../../../lib/i18nContext.jsx';
import { SectionHeader, SectionSurface, SurfaceState, SurfaceStatCard } from '../../ui/surface.jsx';

const CLIENT_STATUSES = ['active', 'waitlist', 'inactive', 'discharged'];

function statusColor(status) {
  switch (status) {
    case 'active':      return 'green';
    case 'waitlist':    return 'yellow';
    case 'inactive':    return 'gray';
    case 'discharged':  return 'blue';
    default:            return 'gray';
  }
}

function initials(first, last) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export default function ClientsTab({ onViewClient }) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  function load() {
    setLoading(true);
    setError('');
    const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    apiFetch(`/api/v1/clients${qs}`)
      .then((data) => setItems(Array.isArray(data?.items) ? data.items : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // Reload when status filter changes
  useEffect(load, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalized = search.trim().toLowerCase();
  const filtered = items.filter((c) => {
    if (!normalized) return true;
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase();
    return name.includes(normalized) || (c.faithBackground ?? '').toLowerCase().includes(normalized);
  });

  // Summary stats from the full unfiltered list
  const activeCount      = items.filter((c) => c.status === 'active').length;
  const waitlistCount    = items.filter((c) => c.status === 'waitlist').length;
  const inactiveCount    = items.filter((c) => c.status === 'inactive').length;
  const dischargedCount  = items.filter((c) => c.status === 'discharged').length;
  const highTpCount      = items.filter((c) => c.highTouchpoint).length;
  const minorCount       = items.filter((c) => c.isMinor).length;

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...CLIENT_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
  ];

  function handleRowClick(client) {
    if (typeof onViewClient === 'function') {
      onViewClient(client.id);
    } else {
      notifications.show({ message: 'Client viewer is not available in this context.', color: 'yellow' });
    }
  }

  return (
    <Stack gap="md">
      {/* Summary stats */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="sm">
        <SurfaceStatCard label="Active"     value={activeCount}     color="green" />
        <SurfaceStatCard label="Waitlist"   value={waitlistCount}   color="yellow" />
        <SurfaceStatCard label="Inactive"   value={inactiveCount}   color="gray" />
        <SurfaceStatCard label="Discharged" value={dischargedCount} color="blue" />
        <SurfaceStatCard label="High Touchpoint" value={highTpCount} color="red" />
        <SurfaceStatCard label="Minors"     value={minorCount}      color="orange" />
      </SimpleGrid>

      <SectionSurface>
        <SectionHeader
          title="Client Directory"
          description={`${items.length} client${items.length === 1 ? '' : 's'} on record. Click any row to open the client's chart.`}
          actions={(
            <Tooltip label="Refresh">
            <ActionIcon variant="subtle" onClick={load}><RefreshCw size={16} /></ActionIcon>
            </Tooltip>
          )}
        />
        <Divider mb="md" />
        <Group mb="md" gap="sm">
          <TextInput
            placeholder="Search by name or faith background…"
            leftSection={<Search size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            data={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v ?? '')}
            placeholder="All Statuses"
            style={{ width: 180 }}
            clearable
          />
        </Group>

        {loading ? (
          <SurfaceState type="loading" message="Loading client directory..." />
        ) : error ? (
          <SurfaceState type="error" title="Unable to load clients" message={error} />
        ) : filtered.length === 0 ? (
          <SurfaceState message="No clients match the current filter." icon={<Users size={24} opacity={0.4} />} />
        ) : (
          <Table striped highlightOnHover withTableBorder withColumnBorders fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th style={{ width: 100 }}>Status</Table.Th>
                <Table.Th style={{ width: 130 }}>Faith Background</Table.Th>
                <Table.Th style={{ width: 80 }}>Flags</Table.Th>
                <Table.Th style={{ width: 100 }}>Created</Table.Th>
                <Table.Th style={{ width: 56 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((client) => (
                <Table.Tr
                  key={client.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleRowClick(client)}
                >
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text fz="sm" fw={500}>
                        {initials(client.firstName, client.lastName)}
                      </Text>
                      <div>
                        <Text fz="sm" fw={500}>
                          {client.firstName} {client.lastName}
                        </Text>
                        {client.preferredName && (
                          <Text fz="xs" c="dimmed">&ldquo;{client.preferredName}&rdquo;</Text>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color={statusColor(client.status)} variant="light">
                      {client.status ?? '—'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fz="sm" c={client.faithBackground ? undefined : 'dimmed'}>
                      {client.faithBackground || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      {client.highTouchpoint && (
                        <Badge size="xs" color="red" variant="filled" title="High touchpoint">HT</Badge>
                      )}
                      {client.isMinor && (
                        <Badge size="xs" color="orange" variant="filled" title="Minor">M</Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text fz="xs" c="dimmed">
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleRowClick(client); }}
                      aria-label="Open client chart"
                    >
                      <ExternalLink size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </SectionSurface>
    </Stack>
  );
}
