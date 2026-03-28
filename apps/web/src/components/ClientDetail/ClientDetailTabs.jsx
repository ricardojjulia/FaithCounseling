import { useState } from 'react';
import { Tabs, Box } from '@mantine/core';
import DemographicsTab    from './tabs/DemographicsTab.jsx';
import ContactsTab        from './tabs/ContactsTab.jsx';
import InsuranceTab       from './tabs/InsuranceTab.jsx';
import ClinicalHistoryTab from './tabs/ClinicalHistoryTab.jsx';
import DiagnosesTab       from './tabs/DiagnosesTab.jsx';
import FaithProfileTab    from './tabs/FaithProfileTab.jsx';
import LegalAdminTab      from './tabs/LegalAdminTab.jsx';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';

const TABS = [
  { id: 'demographics', label: 'Demographics' },
  { id: 'insurance',    label: 'Insurance' },
  { id: 'contacts',     label: 'Contacts' },
  { id: 'clinical',     label: 'Clinical History' },
  { id: 'diagnoses',    label: 'Diagnoses & Meds' },
  { id: 'faith',        label: 'Faith Profile' },
  { id: 'legal',        label: 'Legal & Admin' },
];

export default function ClientDetailTabs({ client, clientId, currentUser }) {
  const [activeTab, setActiveTab] = useState('demographics');
  const activeSurfaceId = {
    demographics: 'client.demographics',
    insurance: 'client.insurance',
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
        {TABS.map((t) => <Tabs.Tab key={t.id} value={t.id} style={{ whiteSpace: 'nowrap' }}>{t.label}</Tabs.Tab>)}
      </Tabs.List>
      <Box style={{ flex: 1, overflowY: 'auto', background: '#f9fafb' }}>
        <Tabs.Panel value="demographics" p="md"><DemographicsTab    client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="insurance"    p="md"><InsuranceTab       client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="contacts"     p="md"><ContactsTab        client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="clinical"     p="md"><ClinicalHistoryTab client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="diagnoses"    p="md"><DiagnosesTab       client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="faith"        p="md"><FaithProfileTab    client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="legal"        p="md"><LegalAdminTab      client={client} clientId={clientId} currentUser={currentUser} /></Tabs.Panel>
      </Box>
    </Tabs>
  );
}
