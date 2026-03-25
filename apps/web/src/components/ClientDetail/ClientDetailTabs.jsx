import { useState } from 'react';
import DemographicsTab from './tabs/DemographicsTab.jsx';
import ContactsTab from './tabs/ContactsTab.jsx';
import InsuranceTab from './tabs/InsuranceTab.jsx';
import ClinicalHistoryTab from './tabs/ClinicalHistoryTab.jsx';
import DiagnosesTab from './tabs/DiagnosesTab.jsx';
import FaithProfileTab from './tabs/FaithProfileTab.jsx';
import LegalAdminTab from './tabs/LegalAdminTab.jsx';

const TABS = [
  { id: 'demographics', label: 'Demographics' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'clinical', label: 'Clinical History' },
  { id: 'diagnoses', label: 'Diagnoses & Meds' },
  { id: 'faith', label: 'Faith Profile' },
  { id: 'legal', label: 'Legal & Admin' },
];

export default function ClientDetailTabs({ client, clientId }) {
  const [activeTab, setActiveTab] = useState('demographics');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div
        className="tab-list"
        role="tablist"
        aria-label="Client detail sections"
        aria-orientation="horizontal"
        style={{
          borderBottom: '1px solid #e1e8ed',
          backgroundColor: '#fff',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="tab-content"
        role="tabpanel"
        style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f9fafb' }}
      >
        {activeTab === 'demographics' && (
          <DemographicsTab client={client} clientId={clientId} />
        )}
        {activeTab === 'insurance' && (
          <InsuranceTab client={client} clientId={clientId} />
        )}
        {activeTab === 'contacts' && (
          <ContactsTab client={client} clientId={clientId} />
        )}
        {activeTab === 'clinical' && (
          <ClinicalHistoryTab client={client} clientId={clientId} />
        )}
        {activeTab === 'diagnoses' && (
          <DiagnosesTab client={client} clientId={clientId} />
        )}
        {activeTab === 'faith' && (
          <FaithProfileTab client={client} clientId={clientId} />
        )}
        {activeTab === 'legal' && (
          <LegalAdminTab client={client} clientId={clientId} />
        )}
      </div>
    </div>
  );
}
