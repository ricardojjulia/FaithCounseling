import { useState, useEffect } from 'react';
import { AppShell, Center, Paper, Text, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import AuthGate from './components/AuthGate';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Metrics from './components/Metrics';
import WorkspaceGrid from './components/WorkspaceGrid';
import ClientDetailPage from './components/ClientDetail/ClientDetailPage.jsx';
import CounselorDetailPage from './components/CounselorDetail/CounselorDetailPage.jsx';
import UserMaintenance from './components/UserMaintenance.jsx';
import CounselorMaintenance from './components/CounselorMaintenance.jsx';
import ClientPickerModal from './components/ClientPickerModal.jsx';
import WorkspaceStudioPage from './components/WorkspaceStudio/WorkspaceStudioPage.jsx';
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
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [metricsData, setMetricsData] = useState({ sessions: 0, appointmentTypes: 0, auditEvents: 0 });
  const [connectionStatus, setConnectionStatus] = useState('loading');
  const [clientsData, setClientsData] = useState({ items: [], loading: true, error: null });
  const [refreshClientsKey, setRefreshClientsKey] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const userRole = currentUser?.role ?? null;

  useEffect(() => {
    fetch('/api/health', { credentials: 'include' })
      .then(() => setConnectionStatus('connected'))
      .catch(() => setConnectionStatus('error'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(async (res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((profile) => { if (cancelled) return; setCurrentUser(normalizeSessionUser(profile)); setIsAuthenticated(true); })
      .catch(() => { if (cancelled) return; setIsAuthenticated(false); setCurrentUser(null); })
      .finally(() => { if (cancelled) return; setAuthBootstrapping(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isCancelled = false;
    fetch('/api/v1/clients', { credentials: 'include' })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((payload) => {
        if (isCancelled) return;
        setClientsData({ items: Array.isArray(payload?.items) ? payload.items : [], loading: false, error: null });
      })
      .catch(() => {
        if (isCancelled) return;
        setClientsData({ items: [], loading: false, error: 'Unable to load clients' });
      });
    return () => { isCancelled = true; };
  }, [refreshClientsKey, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/v1/appointment-types', { credentials: 'include' })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((payload) => {
        const count = Array.isArray(payload?.items) ? payload.items.length : 0;
        setMetricsData((prev) => ({ ...prev, appointmentTypes: count }));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const handleAuthContinue = (profile) => {
    setCurrentUser(normalizeSessionUser(profile));
    setIsAuthenticated(true);
    setSelectedClientId(null);
    setSelectedCounselorId(null);
    setCurrentView('dashboard');
  };

  const handleSignOut = async () => {
    try { await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }); } catch { /* best-effort */ }
    setIsAuthenticated(false);
    setCurrentUser(null);
    closeNav();
    setSelectedClientId(null);
    setSelectedCounselorId(null);
    setCurrentView('dashboard');
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view !== 'clients') setSelectedClientId(null);
    if (view !== 'counselors') setSelectedCounselorId(null);
    closeNav();
  };

  const handleOpenClient     = (clientId) => { setCurrentView('clients');    setSelectedClientId(clientId); };
  const handleClientBack     = ()          => { setSelectedClientId(null);   setCurrentView('clients'); };
  const handleOpenCounselor  = (staffId)   => { setCurrentView('counselors'); setSelectedCounselorId(staffId); };
  const handleCounselorBack  = ()          => { setSelectedCounselorId(null); };

  const showDashboard        = currentView === 'dashboard';
  const showUsers            = currentView === 'users';
  const showCounselors       = currentView === 'counselors';
  const showWorkspaceStudio  = currentView === 'workspace-studio';
  const showClientsWorkspace = currentView === 'clients' || (!showDashboard && !showUsers && !showCounselors && !showWorkspaceStudio);

  if (authBootstrapping) {
    return (
      <Center h="100vh">
        <Paper p="xl" radius="lg" withBorder style={{ textAlign: 'center', minWidth: 300 }}>
          <Loader size="sm" mb="md" />
          <Text fw={600}>Restoring session</Text>
          <Text fz="sm" c="dimmed" mt={4}>Checking for an active session…</Text>
        </Paper>
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate onContinue={handleAuthContinue} />;
  }

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !navOpened } }}
      padding={0}
    >
      <AppShell.Header>
        <TopBar
          opened={navOpened}
          onMenuToggle={toggleNav}
          connectionStatus={connectionStatus}
          currentUser={currentUser}
        />
      </AppShell.Header>

      <AppShell.Navbar>
        <Sidebar
          currentUser={currentUser}
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenClientPicker={() => { setClientPickerOpen(true); closeNav(); }}
          onSignOut={handleSignOut}
        />
      </AppShell.Navbar>

      <AppShell.Main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ClientPickerModal
          isOpen={clientPickerOpen}
          clients={clientsData.items}
          loading={clientsData.loading}
          onSelectClient={handleOpenClient}
          onClose={() => setClientPickerOpen(false)}
        />

        {selectedClientId ? (
          <ClientDetailPage clientId={selectedClientId} onBack={handleClientBack} />
        ) : selectedCounselorId ? (
          <CounselorDetailPage staffId={selectedCounselorId} onBack={handleCounselorBack} currentUser={currentUser} />
        ) : showUsers ? (
          <div style={{ padding: '20px' }}>
            <UserMaintenance userRole={userRole} />
          </div>
        ) : showCounselors ? (
          <div style={{ padding: '20px' }}>
            <CounselorMaintenance userRole={userRole} onViewCounselor={handleOpenCounselor} />
          </div>
        ) : showWorkspaceStudio ? (
          <WorkspaceStudioPage />
        ) : (
          <>
            {showDashboard ? <Metrics data={metricsData} /> : null}
            {showClientsWorkspace || showDashboard ? (
              <WorkspaceGrid
                clientsData={clientsData}
                onClientsUpdated={() => setRefreshClientsKey((k) => k + 1)}
                onViewClient={handleOpenClient}
              />
            ) : null}
          </>
        )}
      </AppShell.Main>
    </AppShell>
  );
}
