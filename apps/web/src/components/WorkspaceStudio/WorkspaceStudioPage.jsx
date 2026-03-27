import { Tabs, Text, Stack, Title, Paper } from '@mantine/core';
import PortalTab from './tabs/PortalTab.jsx';

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
  return (
    <Stack gap="md" p="md">
      <Title order={2} fz="lg">Workspace Studio</Title>
      <Paper withBorder radius="md" p="md">
        <Tabs defaultValue="portal">
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
