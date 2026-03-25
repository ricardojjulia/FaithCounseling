import { useState } from 'react';
import { csrfHeaders } from '../lib/csrf.js';
import ClientModal from './ClientModal';

export default function WorkspaceGrid({ clientsData, onClientsUpdated, onViewClient }) {
  const [activeTab, setActiveTab] = useState('clients');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const clients = clientsData?.items ?? [];
  const clientsLoading = clientsData?.loading ?? false;
  const clientsError = clientsData?.error ?? null;

  const handleAddClient = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setModalOpen(true);
  };

  const handleViewClient = (client) => {
    if (onViewClient) {
      onViewClient(client.id);
    }
  };

  const handleDeleteClient = async (client) => {
    if (!confirm(`Delete client ${client.firstName} ${client.lastName}?`)) return;

    try {
      const response = await fetch(`/api/v1/clients/${client.id}`, {
        method: 'DELETE',
        headers: csrfHeaders(),
      });
      if (response.ok) {
        onClientsUpdated();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleClientSaved = () => {
    onClientsUpdated();
  };

  const tabs = [
    { id: 'practice', label: 'Practice' },
    { id: 'locations', label: 'Locations' },
    { id: 'staff', label: 'Staff' },
    { id: 'lifecycle', label: 'Lifecycle' },
    { id: 'chart', label: 'Chart' },
    { id: 'documentsStudio', label: 'Documents & Inventories' },
    { id: 'clients', label: 'Clients', active: true },
    { id: 'appointments', label: 'Appointments' },
    { id: 'billing', label: 'Billing' },
    { id: 'portal', label: 'Portal' },
  ];

  return (
    <section className="workspace-grid">
      <article className="panel span-2" id="schedulePanel">
        <div className="panel-head">
          <h2>Today's Schedule</h2>
          <div className="panel-head-actions">
            <button type="button" className="action-btn">
              View Calendar
            </button>
            <button type="button" className="action-btn primary">
              New Appointment
            </button>
          </div>
        </div>
        <ul className="timeline" aria-live="polite" aria-busy="false">
          <li style={{ padding: '16px', color: '#62708b' }}>
            No appointments scheduled
          </li>
        </ul>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Priority Queue</h2>
        </div>
        <ul className="checklist" aria-live="polite" aria-busy="false">
          <li style={{ padding: '16px', color: '#62708b' }}>
            All items cleared
          </li>
        </ul>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Compliance Watch</h2>
        </div>
        <ul className="compliance-list" aria-live="polite" aria-busy="false">
          <li style={{ padding: '16px', color: '#62708b' }}>
            No issues detected
          </li>
        </ul>
      </article>

      <article className="panel" id="managePanel">
        <div className="panel-head">
          <h2>Workspace Studio</h2>
        </div>

        <div
          className="tab-list"
          role="tablist"
          aria-label="Workspace studio sections"
          aria-orientation="horizontal"
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              data-tab={tab.id}
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
          style={{
            padding: '16px',
            color: '#62708b',
            textAlign: 'center',
          }}
        >
          Content for {tabs.find(t => t.id === activeTab)?.label} tab
        </div>
      </article>

      <article className="panel" aria-labelledby="clientsPanelTitle">
        <div className="panel-head">
          <h2 id="clientsPanelTitle">Clients</h2>
          <button
            type="button"
            className="action-btn primary"
            onClick={handleAddClient}
          >
            New Client
          </button>
        </div>
        <ul className="checklist" aria-live="polite" aria-busy={clientsLoading ? 'true' : 'false'}>
          {clientsLoading ? (
            <li style={{ padding: '16px', color: '#62708b' }}>Loading clients…</li>
          ) : clientsError ? (
            <li style={{ padding: '16px', color: '#62708b' }}>{clientsError}</li>
          ) : clients.length === 0 ? (
            <li style={{ padding: '16px', color: '#62708b' }}>No clients available</li>
          ) : (
            clients.map((client) => (
              <li
                key={client.id}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #e1e8ed',
                }}
              >
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleViewClient(client)}>
                  <h3 style={{ margin: 0 }}>{client.firstName} {client.lastName}</h3>
                  <p style={{ margin: '4px 0 0', color: '#62708b', fontSize: '0.9rem' }}>
                    Status: {client.status} • Faith: {client.faithBackground || 'Undeclared'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleViewClient(client)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleDeleteClient(client)}
                    style={{ color: '#b42318' }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>

        <ClientModal
          isOpen={modalOpen}
          initialClient={editingClient}
          onClose={() => setModalOpen(false)}
          onSubmit={handleClientSaved}
        />
      </article>
    </section>
  );
}
