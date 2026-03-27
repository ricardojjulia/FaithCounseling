import { useState } from 'react';
import { Paper, Group, Title, Button, Text, Stack, Loader, Box,
         UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../lib/csrf.js';
import ClientModal from './ClientModal';

export default function WorkspaceGrid({ clientsData, onClientsUpdated, onViewClient }) {
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const clients       = clientsData?.items   ?? [];
  const clientsLoading = clientsData?.loading ?? false;
  const clientsError  = clientsData?.error   ?? null;

  const handleAddClient  = () => { setEditingClient(null); setModalOpen(true); };
  const handleViewClient = (client) => { if (onViewClient) onViewClient(client.id); };

  const handleDeleteClient = async (client) => {
    if (!confirm(`Delete client ${client.firstName} ${client.lastName}?`)) return;
    try {
      const res = await fetch(`/api/v1/clients/${client.id}`, { method: 'DELETE', headers: csrfHeaders() });
      if (res.ok) {
        onClientsUpdated();
        notifications.show({ title: 'Deleted', message: `${client.firstName} ${client.lastName} removed.`, color: 'green' });
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message || 'Delete failed', color: 'red' });
    }
  };

  return (
    <Stack gap="md" p="md">
      {/* Today's Schedule */}
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <Title order={3} fz="md">Today's Schedule</Title>
          <Group gap="xs">
            <Button variant="default" size="xs">View Calendar</Button>
            <Button size="xs">New Appointment</Button>
          </Group>
        </Group>
        <Text c="dimmed" fz="sm" py="sm">No appointments scheduled</Text>
      </Paper>

      <Group grow align="flex-start" gap="md">
        {/* Priority Queue */}
        <Paper withBorder radius="md" p="md" style={{ flex: 1 }}>
          <Title order={3} fz="md" mb="sm">Priority Queue</Title>
          <Text c="dimmed" fz="sm">All items cleared</Text>
        </Paper>

        {/* Compliance Watch */}
        <Paper withBorder radius="md" p="md" style={{ flex: 1 }}>
          <Title order={3} fz="md" mb="sm">Compliance Watch</Title>
          <Text c="dimmed" fz="sm">No issues detected</Text>
        </Paper>
      </Group>

      {/* Clients */}
      <Paper withBorder radius="md" p="md" component="section" aria-labelledby="clientsPanelTitle">
        <Group justify="space-between" mb="sm">
          <Title order={3} fz="md" id="clientsPanelTitle">Clients</Title>
          <Button size="xs" onClick={handleAddClient}>New Client</Button>
        </Group>

        {clientsLoading ? (
          <Group justify="center" py="xl"><Loader size="sm" /></Group>
        ) : clientsError ? (
          <Text c="red" fz="sm">{clientsError}</Text>
        ) : clients.length === 0 ? (
          <Text c="dimmed" fz="sm">No clients available</Text>
        ) : (
          <Stack gap={0}>
            {clients.map((client) => (
              <Box
                key={client.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <UnstyledButton style={{ flex: 1 }} onClick={() => handleViewClient(client)}>
                  <Text fw={500} fz="sm">{client.firstName} {client.lastName}</Text>
                  <Text c="dimmed" fz="xs">
                    Status: {client.status} · Faith: {client.faithBackground || 'Undeclared'}
                  </Text>
                </UnstyledButton>
                <Group gap="xs">
                  <Button size="xs" variant="default" onClick={() => handleViewClient(client)}>Edit</Button>
                  <Button size="xs" color="red" variant="light" onClick={() => handleDeleteClient(client)}>Delete</Button>
                </Group>
              </Box>
            ))}
          </Stack>
        )}

        <ClientModal
          isOpen={modalOpen}
          initialClient={editingClient}
          onClose={() => setModalOpen(false)}
          onSubmit={onClientsUpdated}
        />
      </Paper>
    </Stack>
  );
}
