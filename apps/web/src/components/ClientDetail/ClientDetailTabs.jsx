import { useState } from 'react';
import { Tabs, Box } from '@mantine/core';
import DemographicsTab    from './tabs/DemographicsTab.jsx';
import ContactsTab        from './tabs/ContactsTab.jsx';
import ClinicalHistoryTab from './tabs/ClinicalHistoryTab.jsx';
import DiagnosesTab       from './tabs/DiagnosesTab.jsx';
import FaithProfileTab    from './tabs/FaithProfileTab.jsx';
import LegalAdminTab      from './tabs/LegalAdminTab.jsx';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';
import { useI18n } from '../../lib/i18nContext.jsx';

const TABS = [
  { id: 'demographics', labelKey: 'client.tab.demographics' },
  { id: 'contacts', labelKey: 'client.tab.contacts' },
  { id: 'clinical', labelKey: 'client.tab.clinical' },
  { id: 'diagnoses', labelKey: 'client.tab.diagnoses' },
  { id: 'faith', labelKey: 'client.tab.faith' },
  { id: 'legal', labelKey: 'client.tab.legal' },
];

export default function ClientDetailTabs({ client, clientId, currentUser }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('demographics');
  const activeSurfaceId = {
    demographics: 'client.demographics',
    contacts: 'client.contacts',
    clinical: 'client.clinical',
    diagnoses: 'client.diagnoses',
    faith: 'client.faith',
    legal: 'client.legal',
  }[activeTab] ?? 'client.demographics';

  useSurfaceTelemetry(activeSurfaceId, { surfaceKind: 'tab', workflow: 'client_detail' });

  return (
    <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'demographics')} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Tabs.List style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {TABS.map((tab) => <Tabs.Tab key={tab.id} value={tab.id} style={{ whiteSpace: 'nowrap' }}>{t(tab.labelKey)}</Tabs.Tab>)}
      </Tabs.List>
      <Box style={{ flex: 1, overflowY: 'auto', background: '#f9fafb' }}>
        <Tabs.Panel value="demographics" p="md"><DemographicsTab    client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="contacts"     p="md"><ContactsTab        client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="clinical"     p="md"><ClinicalHistoryTab client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="diagnoses"    p="md"><DiagnosesTab       client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="faith"        p="md"><FaithProfileTab    client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="legal"        p="md"><LegalAdminTab      client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
      </Box>
    </Tabs>
  );
}
