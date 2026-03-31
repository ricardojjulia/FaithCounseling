import { useState } from 'react';
import {
  Stack, Title, Text, Select, Paper, Group, Tabs, Alert,
} from '@mantine/core';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';
import { useI18n } from '../../lib/i18nContext.jsx';
import SessionNotesTab   from './tabs/SessionNotesTab.jsx';
import InternalNotesTab  from './tabs/InternalNotesTab.jsx';
import TreatmentPlanTab  from './tabs/TreatmentPlanTab.jsx';
import ProgressTab       from './tabs/ProgressTab.jsx';
import HomeworkTab       from './tabs/HomeworkTab.jsx';

const CHART_TABS = [
  { id: 'sessionNotes',   labelKey: 'chart.tab.sessionNotes' },
  { id: 'internalNotes',  labelKey: 'chart.tab.internalNotes' },
  { id: 'treatmentPlan',  labelKey: 'chart.tab.treatmentPlan' },
  { id: 'progress',       labelKey: 'chart.tab.progress' },
  { id: 'homework',       labelKey: 'chart.tab.homework' },
];

export default function ClinicalChartPage({ clients = [], currentUser }) {
  const { t } = useI18n();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [activeTab, setActiveTab] = useState('sessionNotes');

  useSurfaceTelemetry('clinical_chart', { surfaceKind: 'view', workflow: 'clinical_chart' });

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.id,
  }));

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Title order={2}>{t('topbar.clinical.title')}</Title>
          <Text c="dimmed" size="sm">{t('topbar.clinical.subtitle')}</Text>
        </div>
      </Group>

      <Paper withBorder radius="md" p="md">
        <Select
          label="Client"
          placeholder={t('chart.selectClientPrompt')}
          data={clientOptions}
          value={selectedClientId}
          onChange={(val) => setSelectedClientId(val ?? '')}
          searchable
          clearable
          style={{ maxWidth: 420 }}
        />
      </Paper>

      {!selectedClientId ? (
        <Alert color="blue" variant="light">
          {t('chart.selectClientPrompt')}
        </Alert>
      ) : (
        <Tabs
          value={activeTab}
          onChange={(v) => setActiveTab(v || 'sessionNotes')}
          style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          <Tabs.List style={{ borderBottom: '1px solid var(--mantine-color-default-border)', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {CHART_TABS.map((tab) => (
              <Tabs.Tab key={tab.id} value={tab.id} style={{ whiteSpace: 'nowrap' }}>
                {t(tab.labelKey)}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <Tabs.Panel value="sessionNotes" pt="md">
            <SessionNotesTab clientId={selectedClientId} client={selectedClient} currentUser={currentUser} />
          </Tabs.Panel>

          <Tabs.Panel value="internalNotes" pt="md">
            <InternalNotesTab clientId={selectedClientId} client={selectedClient} currentUser={currentUser} />
          </Tabs.Panel>

          <Tabs.Panel value="treatmentPlan" pt="md">
            <TreatmentPlanTab clientId={selectedClientId} client={selectedClient} currentUser={currentUser} />
          </Tabs.Panel>

          <Tabs.Panel value="progress" pt="md">
            <ProgressTab clientId={selectedClientId} client={selectedClient} />
          </Tabs.Panel>

          <Tabs.Panel value="homework" pt="md">
            <HomeworkTab clientId={selectedClientId} client={selectedClient} />
          </Tabs.Panel>
        </Tabs>
      )}
    </Stack>
  );
}
