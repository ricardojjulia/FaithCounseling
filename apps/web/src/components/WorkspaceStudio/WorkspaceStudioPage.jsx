import { useState } from 'react';
import { Tabs, Text, Stack, Title, Paper } from '@mantine/core';
import PortalTab from './tabs/PortalTab.jsx';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';

const STUDIO_TABS = [
  { id: 'practice',        label: 'Practice' },
  { id: 'locations',       label: 'Locations' },
  { id: 'staff',           label: 'Staff' },
  { id: 'lifecycle',       label: 'Lifecycle' },
  { id: 'chart',           label: 'Chart' },
  { id: 'documentsStudio', label: 'Documents & Inventories' },
  { id: 'clients',         label: 'Clients' },
  { id: 'appointments',    label: 'Appointments' },
  { id: 'billing',         label: 'Billing' },
  { id: 'portal',          label: 'Portal' },
];

export default function WorkspaceStudioPage({ onSchedulePortalRequest }) {
  const [activeTab, setActiveTab] = useState('portal');
  const activeSurfaceId = `studio.${activeTab === 'documentsStudio' ? 'documents' : activeTab}`;

  useSurfaceTelemetry(activeSurfaceId, {
    surfaceKind: 'tab',
    workflow: 'workspace_studio',
    emptyState: activeTab === 'portal' ? null : 'placeholder',
  });

  return (
    <Stack gap="md" p="md">
      <Title order={2} fz="lg">Workspace Studio</Title>
      <Paper withBorder radius="md" p="md">
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'portal')}>
          <Tabs.List style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            {STUDIO_TABS.map((t) => (
              <Tabs.Tab key={t.id} value={t.id} style={{ whiteSpace: 'nowrap' }}>
                {t.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {STUDIO_TABS.map((t) => (
            <Tabs.Panel key={t.id} value={t.id} pt="md">
              {t.id === 'portal' ? (
                <PortalTab onSchedulePortalRequest={onSchedulePortalRequest} />
              ) : (
                <Text c="dimmed" fz="sm">Content for {t.label} tab</Text>
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      </Paper>
    </Stack>
  );
}
