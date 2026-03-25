import { useState, useEffect } from 'react';
import AuthGate from './components/AuthGate';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Metrics from './components/Metrics';
import WorkspaceGrid from './components/WorkspaceGrid';
import ClientDetailPage from './components/ClientDetail/ClientDetailPage.jsx';
import UserMaintenance from './components/UserMaintenance.jsx';
import './App.css';

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function normalizeSessionUser(profile) {
  if (!profile || typeof profile !== 'object') return null;

  const rawName = profile.name;
  const nestedName = rawName && typeof rawName === 'object'
    ? firstString(rawName.fullName, rawName.displayName, rawName.name)
    : null;
  const directName = typeof rawName === 'string' ? rawName : null;
  const combinedName = [profile.firstName, profile.lastName]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ');

  return {
    staffId: firstString(profile.staffId, profile.staffMemberId, profile.staff_account_id) ?? profile.staffAccountId ?? null,
    staffAccountId: profile.staffAccountId ?? profile.staff_account_id ?? null,
    tenantId: firstString(profile.tenantId, profile.tenant_id) ?? null,
    role: firstString(profile.role, profile.userRole) ?? null,
    name: firstString(directName, nestedName, combinedName, profile.displayName) ?? null,
    email: firstString(profile.email, profile.username) ?? null,
  };
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [metricsData] = useState({
    sessions: 0,
    appointmentTypes: 0,
    auditEvents: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState('loading');
  const [clientsData, setClientsData] = useState({
    items: [],
    loading: true,
    error: null,
  });
  const [refreshClientsKey, setRefreshClientsKey] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const userRole = currentUser?.role ?? null;

  useEffect(() => {
    fetch('/api/health', { credentials: 'include' })
      .then(() => setConnectionStatus('connected'))
      .catch(() => setConnectionStatus('error'));
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('No active session');
        }
        return response.json();
      })
      .then((profile) => {
        if (cancelled) return;
        setCurrentUser(normalizeSessionUser(profile));
        setIsAuthenticated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsAuthenticated(false);
        setCurrentUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setAuthBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isCancelled = false;

    fetch('/api/v1/clients', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load clients');
        }
        return response.json();
      })
      .then((payload) => {
        if (isCancelled) return;
        setClientsData({
          items: Array.isArray(payload?.items) ? payload.items : [],
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (isCancelled) return;
        setClientsData({
          items: [],
          loading: false,
          error: 'Unable to load clients',
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [refreshClientsKey, isAuthenticated]);

  const handleAuthContinue = (profile) => {
    setCurrentUser(normalizeSessionUser(profile));
    setIsAuthenticated(true);
    setSelectedClientId(null);
    setCurrentView('dashboard');
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort sign out.
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSidebarOpen(false);
    setSelectedClientId(null);
    setCurrentView('dashboard');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view !== 'clients') {
      setSelectedClientId(null);
    }
  };

  const handleOpenClient = (clientId) => {
    setCurrentView('clients');
    setSelectedClientId(clientId);
  };

  const handleClientBack = () => {
    setSelectedClientId(null);
    setCurrentView('clients');
  };

  const showDashboard = currentView === 'dashboard';
  const showUsers = currentView === 'users';
  const showClientsWorkspace = currentView === 'clients' || (!showDashboard && !showUsers);

  if (authBootstrapping) {
    return (
      <section className="auth-gate visible">
        <div className="auth-card auth-card--loading">
          <p className="auth-kicker">Secure Workspace</p>
          <h2>Restoring session</h2>
          <p>Checking for an active session before loading protected data.</p>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate onContinue={handleAuthContinue} />;
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
      />
      <main className="main-content">
        <TopBar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          connectionStatus={connectionStatus}
          currentUser={currentUser}
        />
        {selectedClientId ? (
          <ClientDetailPage
            clientId={selectedClientId}
            onBack={handleClientBack}
          />
        ) : showUsers ? (
          <div style={{ padding: '20px' }}>
            <UserMaintenance userRole={userRole} />
          </div>
        ) : (
          <>
            {showDashboard ? <Metrics data={metricsData} /> : null}
            {showClientsWorkspace || showDashboard ? (
              <WorkspaceGrid
                clientsData={clientsData}
                onClientsUpdated={() => setRefreshClientsKey((key) => key + 1)}
                onViewClient={handleOpenClient}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
