import { useEffect, useState } from 'react';
import { Tabs, Text, Stack, Title, Paper } from '@mantine/core';
import PortalTab from './tabs/PortalTab.jsx';
import DocumentsStudioTab from './tabs/DocumentsStudioTab.jsx';
import OfferingsTab from './tabs/OfferingsTab.jsx';
import PracticeTab from './tabs/PracticeTab.jsx';
import LocationsTab from './tabs/LocationsTab.jsx';
import StaffTab from './tabs/StaffTab.jsx';
import LifecycleTab from './tabs/LifecycleTab.jsx';
import AppointmentsTab from './tabs/AppointmentsTab.jsx';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';
import { useI18n } from '../../lib/i18nContext.jsx';

const STUDIO_TABS = [
  { id: 'practice', labelKey: 'studio.tab.practice' },
  { id: 'locations', labelKey: 'studio.tab.locations' },
  { id: 'staff', labelKey: 'studio.tab.staff' },
  { id: 'lifecycle', labelKey: 'studio.tab.lifecycle' },
  { id: 'chart', labelKey: 'studio.tab.chart' },
  { id: 'documentsStudio', labelKey: 'studio.tab.documentsStudio' },
  { id: 'clients', labelKey: 'studio.tab.clients' },
  { id: 'appointments', labelKey: 'studio.tab.appointments' },
  { id: 'offerings', labelKey: 'studio.tab.offerings' },
  { id: 'portal', labelKey: 'studio.tab.portal' },
];

export default function WorkspaceStudioPage({ initialTab = 'portal', onSchedulePortalRequest, onViewClient, onOpenCounselorMaintenance, initialDocumentsClientId = '' }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(initialTab || 'portal');
  const activeSurfaceId = `studio.${activeTab === 'documentsStudio' ? 'documents' : activeTab}`;

  useEffect(() => {
    setActiveTab(initialTab || 'portal');
  }, [initialTab]);

  useSurfaceTelemetry(activeSurfaceId, {
    surfaceKind: 'tab',
    workflow: 'workspace_studio',
    emptyState: activeTab === 'portal' ? null : 'placeholder',
  });

  return (
    <Stack gap="md" p="md">
      <Title order={2} fz="lg">{t('studio.title')}</Title>
      <Paper withBorder radius="md" p="md">
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'portal')}>
          <Tabs.List style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            {STUDIO_TABS.map((tab) => (
              <Tabs.Tab key={tab.id} value={tab.id} style={{ whiteSpace: 'nowrap' }}>
                {t(tab.labelKey)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {STUDIO_TABS.map((tab) => (
            <Tabs.Panel key={tab.id} value={tab.id} pt="md">
              {tab.id === 'portal' ? (
                <PortalTab onSchedulePortalRequest={onSchedulePortalRequest} onViewClient={onViewClient} />
              ) : tab.id === 'documentsStudio' ? (
                <DocumentsStudioTab initialClientId={initialDocumentsClientId} />
              ) : tab.id === 'offerings' ? (
                <OfferingsTab />
              ) : tab.id === 'practice' ? (
                <PracticeTab />
              ) : tab.id === 'locations' ? (
                <LocationsTab />
              ) : tab.id === 'staff' ? (
                <StaffTab onOpenCounselorMaintenance={onOpenCounselorMaintenance} />
              ) : tab.id === 'lifecycle' ? (
                <LifecycleTab onOpenClient={onViewClient} />
              ) : tab.id === 'appointments' ? (
                <AppointmentsTab />
              ) : (
                <Text c="dimmed" fz="sm">{t('studio.placeholderForTab', { tab: t(tab.labelKey) })}</Text>
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      </Paper>
    </Stack>
  );
}
