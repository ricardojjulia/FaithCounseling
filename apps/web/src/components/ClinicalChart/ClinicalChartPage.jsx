import { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Select, Paper, Group, Tabs, Alert,
} from '@mantine/core';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';
import { useI18n } from '../../lib/i18nContext.jsx';
import ClinicalChartSummaryHeader from './ClinicalChartSummaryHeader.jsx';
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

export default function ClinicalChartPage({
  clients = [],
  currentUser,
  initialClientId = '',
  initialTab = 'sessionNotes',
  initialSessionNotesComposerOpen = false,
  initialSessionNotesAppointmentAt = '',
  handoffKey = 0,
}) {
  const { t } = useI18n();
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setSelectedClientId(initialClientId ?? '');
  }, [handoffKey, initialClientId]);

  useEffect(() => {
    setActiveTab(initialTab || 'sessionNotes');
  }, [handoffKey, initialTab]);

  useSurfaceTelemetry('clinical', { surfaceKind: 'view', workflow: 'clinical_chart' });

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.id,
  }));

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  return (
    <Stack p="md" gap="md">
      <Paper
        radius="xl"
        p="xl"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(129,140,248,0.18), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.97), rgba(240,244,255,0.94))',
          border: '1px solid rgba(79,70,229,0.12)',
          boxShadow: '0 20px 50px rgba(34, 51, 93, 0.08)',
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">
          <div>
            <Text size="xs" tt="uppercase" fw={700} c="indigo" style={{ letterSpacing: '0.12em', marginBottom: 6 }}>
              Clinical Workspace
            </Text>
            <Title order={2}>{t('topbar.clinical.title')}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {t('topbar.clinical.subtitle')}
            </Text>
          </div>
          <Select
            label="Client"
            placeholder={t('chart.selectClientPrompt')}
            data={clientOptions}
            value={selectedClientId}
            onChange={(val) => setSelectedClientId(val ?? '')}
            searchable
            clearable
            style={{ width: 'min(420px, 100%)' }}
          />
        </Group>
      </Paper>

      {!selectedClientId ? (
        <Alert color="blue" variant="light">
          {t('chart.selectClientPrompt')}
        </Alert>
      ) : (
        <>
          <ClinicalChartSummaryHeader clientId={selectedClientId} client={selectedClient} />

          <Tabs
            value={activeTab}
            onChange={(v) => setActiveTab(v || 'sessionNotes')}
            style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
          >
            <Tabs.List
              style={{
                borderBottom: '1px solid var(--mantine-color-default-border)',
                overflowX: 'auto',
                flexWrap: 'nowrap',
                background: 'rgba(255,255,255,0.74)',
                borderRadius: '18px',
                padding: 8,
                boxShadow: '0 16px 34px rgba(34, 51, 93, 0.05)',
              }}
            >
              {CHART_TABS.map((tab) => (
                <Tabs.Tab key={tab.id} value={tab.id} style={{ whiteSpace: 'nowrap', borderRadius: 12 }}>
                  {t(tab.labelKey)}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel value="sessionNotes" pt="md">
              <SessionNotesTab
                clientId={selectedClientId}
                client={selectedClient}
                currentUser={currentUser}
                initialComposerOpen={initialSessionNotesComposerOpen}
                initialAppointmentAt={initialSessionNotesAppointmentAt}
                handoffKey={handoffKey}
              />
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
        </>
      )}
    </Stack>
  );
}
