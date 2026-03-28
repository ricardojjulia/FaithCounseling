import { useState } from 'react';
import { Tabs, Box } from '@mantine/core';
import ProfileTab               from './tabs/ProfileTab.jsx';
import LicensesTab              from './tabs/LicensesTab.jsx';
import SpecialtiesTab           from './tabs/SpecialtiesTab.jsx';
import CounselorFaithProfileTab from './tabs/CounselorFaithProfileTab.jsx';
import CertificationsTab        from './tabs/CertificationsTab.jsx';
import EmploymentTab            from './tabs/EmploymentTab.jsx';
import AvailabilityTab          from './tabs/AvailabilityTab.jsx';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';

const TABS = [
  { id: 'profile',        label: 'Profile' },
  { id: 'licenses',       label: 'Licenses' },
  { id: 'specialties',    label: 'Specialties' },
  { id: 'faith',          label: 'Faith Profile' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'employment',     label: 'Employment' },
  { id: 'availability',   label: 'Availability' },
];

export default function CounselorDetailTabs({ counselor, staffId, currentUser }) {
  const [activeTab, setActiveTab] = useState('profile');
  const activeSurfaceId = {
    profile: 'counselor.profile',
    licenses: 'counselor.licenses',
    specialties: 'counselor.specialties',
    faith: 'counselor.faith',
    certifications: 'counselor.certifications',
    employment: 'counselor.employment',
    availability: 'counselor.availability',
  }[activeTab] ?? 'counselor.profile';

  useSurfaceTelemetry(activeSurfaceId, { surfaceKind: 'tab', workflow: 'counselor_detail' });

  return (
    <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'profile')} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Tabs.List style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {TABS.map((t) => <Tabs.Tab key={t.id} value={t.id} style={{ whiteSpace: 'nowrap' }}>{t.label}</Tabs.Tab>)}
      </Tabs.List>
      <Box style={{ flex: 1, overflowY: 'auto', background: '#f9fafb' }}>
        <Tabs.Panel value="profile"        p="md"><ProfileTab               counselor={counselor} staffId={staffId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="licenses"       p="md"><LicensesTab              staffId={staffId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="specialties"    p="md"><SpecialtiesTab           staffId={staffId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="faith"          p="md"><CounselorFaithProfileTab staffId={staffId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="certifications" p="md"><CertificationsTab        staffId={staffId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="employment"     p="md"><EmploymentTab            staffId={staffId} currentUser={currentUser} /></Tabs.Panel>
        <Tabs.Panel value="availability"   p="md"><AvailabilityTab          staffId={staffId} /></Tabs.Panel>
      </Box>
    </Tabs>
  );
}
