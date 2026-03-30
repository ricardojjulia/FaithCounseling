import { useState, useEffect } from 'react';
import { AppShell, Center, Paper, Text, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import AuthGate from './components/AuthGate';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Metrics from './components/Metrics';
import WorkspaceGrid from './components/WorkspaceGrid';
import ClientsPage from './components/ClientsPage.jsx';
import ClientDetailPage from './components/ClientDetail/ClientDetailPage.jsx';
import CounselorDetailPage from './components/CounselorDetail/CounselorDetailPage.jsx';
import UserMaintenance from './components/UserMaintenance.jsx';
import CounselorMaintenance from './components/CounselorMaintenance.jsx';
import ClientPickerModal from './components/ClientPickerModal.jsx';
import WorkspaceStudioPage from './components/WorkspaceStudio/WorkspaceStudioPage.jsx';
import SchedulingPage from './components/SchedulingPage.jsx';
import DocumentsPage from './components/Documents/DocumentsPage.jsx';
import ClientPortalPage from './components/Portal/ClientPortalPage.jsx';
import OfferingsPage from './components/Offerings/OfferingsPage.jsx';
import { csrfHeaders } from './lib/csrf.js';
import { fetchOperationsSummary } from './lib/clientApi.js';
import { frontendTelemetry } from './lib/frontendTelemetry.js';
import { useSurfaceTelemetry } from './lib/useSurfaceTelemetry.js';
import { useI18n } from './lib/i18nContext.jsx';
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
    clientId: firstString(profile.clientId, profile.client_id) ?? null,
    portalAccountId: firstString(profile.portalAccountId, profile.portal_account_id) ?? null,
    tenantId: firstString(profile.tenantId, profile.tenant_id) ?? null,
    role: firstString(profile.role, profile.userRole) ?? null,
    name: firstString(directName, nestedName, combinedName, profile.displayName) ?? null,
    email: firstString(profile.email, profile.username) ?? null,
  };
}

function defaultCalendarView(role) {
  return ['platform_admin', 'practice_owner', 'practice_admin', 'scheduler_biller'].includes(role || '')
    ? 'practice'
    : 'counselor';
}

function defaultViewForRole(role) {
  return role === 'client' ? 'portal' : 'dashboard';
}

function toValidDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function summarizeAppointmentMetrics(items) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  let sessions = 0;
  let futureAppointments = 0;

  for (const item of items) {
    const startsAt = toValidDate(item?.startsAt ?? item?.scheduledAt ?? item?.starts_at ?? item?.scheduled_at);
    if (!startsAt) continue;

    const isCancelled = item?.status === 'cancelled' || item?.status === 'canceled';
    if (isCancelled) continue;

    if (startsAt >= startOfToday && startsAt < startOfTomorrow) {
      sessions += 1;
    }
    if (startsAt >= now) {
      futureAppointments += 1;
    }
  }

  return { sessions, futureAppointments };
}

export default function App() {
  const { t } = useI18n();
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [metricsData, setMetricsData] = useState({
    sessions: 0,
    sessionsMeta: t('metrics.scheduledToday'),
    futureAppointments: 0,
    futureAppointmentsMeta: t('metrics.scheduledAhead'),
    auditEvents: 0,
    auditEventsMeta: t('metrics.last7Days'),
  });
  const [connectionStatus, setConnectionStatus] = useState('loading');
  const [clientsData, setClientsData] = useState({ items: [], loading: true, error: null });
  const [operationsSummaryData, setOperationsSummaryData] = useState({ summary: null, loading: true, error: null });
  const [refreshClientsKey, setRefreshClientsKey] = useState(0);
  const [refreshOperationsKey, setRefreshOperationsKey] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [workspaceStudioInitialTab, setWorkspaceStudioInitialTab] = useState('portal');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [schedulingState, setSchedulingState] = useState({
    composerOpen: false,
    initialClientId: null,
    initialView: null,
    initialPortalRequest: null,
  });
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
      .then((profile) => {
        if (cancelled) return;
        const normalized = normalizeSessionUser(profile);
        setCurrentUser(normalized);
        setIsAuthenticated(true);
        setCurrentView(defaultViewForRole(normalized?.role ?? null));
      })
      .catch(() => { if (cancelled) return; setIsAuthenticated(false); setCurrentUser(null); })
      .finally(() => { if (cancelled) return; setAuthBootstrapping(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (userRole === 'client') {
      setClientsData({ items: [], loading: false, error: null });
      return;
    }
    let isCancelled = false;
    fetch('/api/v1/clients', { credentials: 'include' })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((payload) => {
        if (isCancelled) return;
        setClientsData({ items: Array.isArray(payload?.items) ? payload.items : [], loading: false, error: null });
      })
      .catch(() => {
        if (isCancelled) return;
        setClientsData({ items: [], loading: false, error: t('clients.error.loadFailed') });
      });
    return () => { isCancelled = true; };
  }, [refreshClientsKey, isAuthenticated, t, userRole]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (userRole === 'client') {
      setOperationsSummaryData({ summary: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    setOperationsSummaryData((current) => ({ ...current, loading: true, error: null }));

    fetchOperationsSummary(timezone)
      .then((payload) => {
        if (cancelled) return;
        setOperationsSummaryData({
          summary: payload?.summary ?? null,
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setOperationsSummaryData({
          summary: null,
          loading: false,
          error: error.message || t('state.unableToLoad'),
        });
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, refreshOperationsKey, t, userRole]);

  useEffect(() => {
    if (!isAuthenticated || userRole === 'client' || currentView !== 'dashboard') return undefined;
    const intervalId = window.setInterval(() => {
      setRefreshOperationsKey((value) => value + 1);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [currentView, isAuthenticated, userRole]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (userRole === 'client') return;
    fetch('/api/v1/appointments', { credentials: 'include' })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((payload) => {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const { sessions, futureAppointments } = summarizeAppointmentMetrics(items);
        setMetricsData((prev) => ({
          ...prev,
          sessions,
          sessionsMeta: t('metrics.scheduledToday'),
          futureAppointments,
          futureAppointmentsMeta: t('metrics.scheduledAhead'),
        }));
      })
      .catch(() => {});
  }, [isAuthenticated, t, userRole]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const canReadAuditSummary = ['platform_admin', 'practice_owner', 'practice_admin'].includes(userRole || '');
    if (!canReadAuditSummary) {
      setMetricsData((prev) => ({
        ...prev,
        auditEvents: 0,
        auditEventsMeta: t('metrics.adminVisibilityRequired'),
      }));
      return;
    }

    fetch('/api/v1/audit/intelligence?days=7&limit=1', { credentials: 'include' })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((payload) => {
        const total = Number(payload?.summary?.total ?? 0);
        setMetricsData((prev) => ({
          ...prev,
          auditEvents: total,
          auditEventsMeta: t('metrics.last7Days'),
        }));
      })
      .catch(() => {
        setMetricsData((prev) => ({
          ...prev,
          auditEventsMeta: t('state.unableToLoad'),
        }));
      });
  }, [isAuthenticated, userRole, t]);

  const handleAuthContinue = (profile) => {
    const normalized = normalizeSessionUser(profile);
    setCurrentUser(normalized);
    setIsAuthenticated(true);
    setSelectedClientId(null);
    setSelectedCounselorId(null);
    setCurrentView(defaultViewForRole(normalized?.role ?? null));
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
      });
      if (!response.ok) {
        return;
      }
    } catch {
      return;
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    closeNav();
    setSelectedClientId(null);
    setSelectedCounselorId(null);
    setCurrentView('dashboard');
    setOperationsSummaryData({ summary: null, loading: true, error: null });
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view !== 'clients') setSelectedClientId(null);
    if (view !== 'counselors') setSelectedCounselorId(null);
    if (view !== 'scheduling') {
      setSchedulingState({ composerOpen: false, initialClientId: null, initialView: null, initialPortalRequest: null });
    }
    closeNav();
  };

  const handleOpenClient     = (clientId) => { setCurrentView('clients');    setSelectedClientId(clientId); };
  const handleClientBack     = ()          => { setSelectedClientId(null);   setCurrentView('clients'); };
  const handleOpenCounselor  = (staffId)   => { setCurrentView('counselors'); setSelectedCounselorId(staffId); };
  const handleCounselorBack  = ()          => { setSelectedCounselorId(null); };
  const handleOpenScheduling = ({
    composerOpen = false,
    initialClientId = null,
    initialView = null,
    initialPortalRequest = null,
  } = {}) => {
    setSchedulingState({ composerOpen, initialClientId, initialView, initialPortalRequest });
    setCurrentView('scheduling');
    closeNav();
  };
  const handleOpenDocuments = () => {
    setCurrentView('documents');
    closeNav();
  };
  const handleOpenWorkspaceStudio = (initialTab = 'portal') => {
    setWorkspaceStudioInitialTab(initialTab);
    setCurrentView('workspace-studio');
    closeNav();
  };

  const handlePortalRequestScheduled = async (portalRequest) => {
    if (!portalRequest?.id) return;
    try {
      await fetch('/api/v1/portal/appointment-requests', {
        method: 'PATCH',
        headers: csrfHeaders(),
        body: JSON.stringify({ requestId: portalRequest.id, status: 'scheduled' }),
      });
    } catch {
      // best effort; scheduling already succeeded
    }
  };

  const showDashboard        = currentView === 'dashboard';
  const showUsers            = currentView === 'users';
  const showCounselors       = currentView === 'counselors';
  const showClients          = currentView === 'clients';
  const showScheduling       = currentView === 'scheduling';
  const showWorkspaceStudio  = currentView === 'workspace-studio';
  const showDocuments        = currentView === 'documents';
  const showPortal           = currentView === 'portal';
  const showOfferings        = currentView === 'offerings';
  const showFallbackWorkspace = !showDashboard && !showUsers && !showCounselors && !showClients && !showScheduling && !showWorkspaceStudio && !showDocuments && !showPortal && !showOfferings;
  const topLevelSurfaceId = !isAuthenticated
    ? 'auth'
    : selectedClientId || selectedCounselorId
      ? null
      : showUsers
        ? 'users'
        : showCounselors
          ? 'counselors'
          : showClients
            ? 'clients'
          : showScheduling
            ? 'scheduling'
            : showWorkspaceStudio
              ? 'workspace_studio'
              : showDashboard
                ? 'dashboard'
                : currentView;

  useEffect(() => {
    frontendTelemetry.setRole(userRole ?? 'anonymous');
  }, [userRole]);

  useSurfaceTelemetry(topLevelSurfaceId, {
    surfaceKind: 'view',
    workflow: 'navigation',
    emptyState: ['clinical', 'offerings', 'faith'].includes(topLevelSurfaceId) ? 'placeholder' : null,
  });

  useEffect(() => {
    if (clientPickerOpen) {
      frontendTelemetry.trackSurfaceView('modal.client_picker', { surfaceKind: 'modal', workflow: 'client_picker' });
    }
  }, [clientPickerOpen]);

  if (authBootstrapping) {
    return (
      <Center h="100vh">
        <Paper p="xl" radius="lg" withBorder style={{ textAlign: 'center', minWidth: 300 }}>
          <Loader size="sm" mb="md" />
          <Text fw={600}>{t('auth.restoringSession')}</Text>
          <Text fz="sm" c="dimmed" mt={4}>{t('auth.checkingSession')}</Text>
        </Paper>
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate onContinue={handleAuthContinue} />;
  }

  return (
    <AppShell
      header={{ height: 96 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !navOpened, desktop: !navOpened } }}
      padding={0}
    >
      <AppShell.Header>
        <TopBar
          opened={navOpened}
          onMenuToggle={toggleNav}
          onSignOut={handleSignOut}
          currentUser={currentUser}
          currentView={currentView}
        />
      </AppShell.Header>

      <AppShell.Navbar>
        <Sidebar
          currentUser={currentUser}
          currentView={currentView}
          connectionStatus={connectionStatus}
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
          <ClientDetailPage
            clientId={selectedClientId}
            onBack={handleClientBack}
            onScheduleClient={() => handleOpenScheduling({
              composerOpen: true,
              initialClientId: selectedClientId,
              initialView: defaultCalendarView(userRole),
            })}
          />
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
        ) : showScheduling ? (
          <SchedulingPage
            currentUser={currentUser}
            clients={clientsData.items}
            initialComposerOpen={schedulingState.composerOpen}
            initialClientId={schedulingState.initialClientId}
            initialView={schedulingState.initialView}
            initialPortalRequest={schedulingState.initialPortalRequest}
            onComposerHandled={() => setSchedulingState((state) => ({ ...state, composerOpen: false, initialPortalRequest: null }))}
            onPortalRequestScheduled={handlePortalRequestScheduled}
            onAppointmentsUpdated={() => setRefreshOperationsKey((value) => value + 1)}
            onOpenClient={handleOpenClient}
          />
        ) : showWorkspaceStudio ? (
          <WorkspaceStudioPage
            initialTab={workspaceStudioInitialTab}
            onSchedulePortalRequest={(clientId, portalRequest) => handleOpenScheduling({
              composerOpen: true,
              initialClientId: clientId,
              initialView: 'practice',
              initialPortalRequest: portalRequest,
            })}
          />
        ) : showDocuments ? (
          <DocumentsPage />
        ) : showClients ? (
          <ClientsPage
            clientsData={clientsData}
            onClientsUpdated={() => {
              setRefreshClientsKey((k) => k + 1);
              setRefreshOperationsKey((value) => value + 1);
            }}
            onViewClient={handleOpenClient}
            onScheduleClient={(clientId) => handleOpenScheduling({
              composerOpen: true,
              initialClientId: clientId,
              initialView: defaultCalendarView(userRole),
            })}
          />
        ) : showPortal ? (
          <ClientPortalPage currentUser={currentUser} clients={clientsData.items} onSignOut={handleSignOut} />
        ) : showOfferings ? (
          <OfferingsPage clients={clientsData.items} />
        ) : (
          <>
            {showDashboard ? <Metrics data={metricsData} currentUser={currentUser} /> : null}
            {showFallbackWorkspace || showDashboard ? (
              <WorkspaceGrid
                clientsData={clientsData}
                operationsSummaryData={operationsSummaryData}
                onClientsUpdated={() => {
                  setRefreshClientsKey((k) => k + 1);
                  setRefreshOperationsKey((value) => value + 1);
                }}
                onViewClient={handleOpenClient}
                onViewCalendar={() => handleOpenScheduling({ initialView: defaultCalendarView(userRole) })}
                onNewAppointment={() => handleOpenScheduling({ composerOpen: true, initialView: defaultCalendarView(userRole) })}
                onScheduleClient={(clientId) => handleOpenScheduling({
                  composerOpen: true,
                  initialClientId: clientId,
                  initialView: defaultCalendarView(userRole),
                })}
                onOpenDocuments={handleOpenDocuments}
                onOpenPortalQueue={() => handleOpenWorkspaceStudio('portal')}
              />
            ) : null}
          </>
        )}
      </AppShell.Main>
    </AppShell>
  );
}
