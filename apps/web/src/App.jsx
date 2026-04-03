import { Suspense, lazy, useEffect, useState } from 'react';
import { AppShell, Center, Paper, Text, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import AuthGate from './components/AuthGate';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Metrics from './components/Metrics';
import WorkspaceGrid from './components/WorkspaceGrid';
import { csrfHeaders } from './lib/csrf.js';
import { fetchClients, fetchOperationsSummaryScoped, fetchAppointments } from './lib/clientApi.js';
import { frontendTelemetry } from './lib/frontendTelemetry.js';
import { useSurfaceTelemetry } from './lib/useSurfaceTelemetry.js';
import { useI18n } from './lib/i18nContext.jsx';
import { buildCounselorWorkspaceData } from './lib/counselorWorkspace.js';
import { isClientRole, isCounselorRole } from './lib/roles.js';
import './App.css';

const CounselorHomePage = lazy(() => import('./components/CounselorHomePage.jsx'));
const CounselorTasksPage = lazy(() => import('./components/CounselorTasksPage.jsx'));
const ClientsPage = lazy(() => import('./components/ClientsPage.jsx'));
const ClientDetailPage = lazy(() => import('./components/ClientDetail/ClientDetailPage.jsx'));
const CounselorDetailPage = lazy(() => import('./components/CounselorDetail/CounselorDetailPage.jsx'));
const UserMaintenance = lazy(() => import('./components/UserMaintenance.jsx'));
const CounselorMaintenance = lazy(() => import('./components/CounselorMaintenance.jsx'));
const ClientPickerModal = lazy(() => import('./components/ClientPickerModal.jsx'));
const WorkspaceStudioPage = lazy(() => import('./components/WorkspaceStudio/WorkspaceStudioPage.jsx'));
const SchedulingPage = lazy(() => import('./components/SchedulingPage.jsx'));
const DocumentsPage = lazy(() => import('./components/Documents/DocumentsPage.jsx'));
const ClientPortalPage = lazy(() => import('./components/Portal/ClientPortalPage.jsx'));
const OfferingsPage = lazy(() => import('./components/Offerings/OfferingsPage.jsx'));
const ClinicalChartPage = lazy(() => import('./components/ClinicalChart/ClinicalChartPage.jsx'));
const FaithWorkflowsPage = lazy(() => import('./components/FaithWorkflows/FaithWorkflowsPage.jsx'));

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
  if (isClientRole(role)) return 'portal';
  if (isCounselorRole(role)) return 'counselor-home';
  return 'dashboard';
}

function createDefaultClinicalChartState() {
  return {
    initialClientId: '',
    initialTab: 'sessionNotes',
    initialSessionNotesComposerOpen: false,
    initialSessionNotesAppointmentAt: '',
    handoffKey: 0,
  };
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
  const thirtyOneDaysOut = new Date(startOfToday);
  thirtyOneDaysOut.setDate(thirtyOneDaysOut.getDate() + 31);
  const jan1 = new Date(now.getFullYear(), 0, 1);

  let sessions = 0;
  let futureAppointments = 0;
  let yearlyAppointments = 0;

  for (const item of items) {
    const startsAt = toValidDate(item?.startsAt ?? item?.scheduledAt ?? item?.starts_at ?? item?.scheduled_at);
    if (!startsAt) continue;

    const isCancelled = item?.status === 'cancelled' || item?.status === 'canceled';
    if (isCancelled) continue;

    if (startsAt >= startOfToday && startsAt < startOfTomorrow) {
      sessions += 1;
    }
    if (startsAt >= startOfTomorrow && startsAt < thirtyOneDaysOut) {
      futureAppointments += 1;
    }
    if (startsAt >= jan1 && startsAt < startOfToday) {
      yearlyAppointments += 1;
    }
  }

  return { sessions, futureAppointments, yearlyAppointments };
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
    futureAppointmentsMeta: t('metrics.scheduledAhead30'),
    yearlyAppointments: 0,
    faithfulCounts: { critical: 0, moderate: 0, routine: 0 },
  });
  const [connectionStatus, setConnectionStatus] = useState('loading');
  const [clientsData, setClientsData] = useState({ items: [], loading: true, error: null });
  const [operationsSummaryData, setOperationsSummaryData] = useState({ summary: null, loading: true, error: null });
  const [refreshClientsKey, setRefreshClientsKey] = useState(0);
  const [refreshOperationsKey, setRefreshOperationsKey] = useState(0);
  const [selectedClientRequest, setSelectedClientRequest] = useState(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [portalState, setPortalState] = useState({ initialClientId: null, initialTab: 'dashboard' });
  const [workspaceStudioInitialTab, setWorkspaceStudioInitialTab] = useState('portal');
  const [clinicalChartState, setClinicalChartState] = useState(createDefaultClinicalChartState);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [schedulingState, setSchedulingState] = useState({
    composerOpen: false,
    initialClientId: null,
    initialView: null,
    initialPortalRequest: null,
  });
  const userRole = currentUser?.role ?? null;
  const selectedClientId = selectedClientRequest?.clientId ?? null;
  const counselorWorkspaceData = buildCounselorWorkspaceData(operationsSummaryData.summary, clientsData.items, currentUser);
  const surfaceLoadingFallback = (
    <Center h="100%" mih={280}>
      <Paper p="xl" radius="lg" withBorder style={{ textAlign: 'center', minWidth: 280 }}>
        <Loader size="sm" mb="md" />
        <Text fw={600}>{t('state.loading')}</Text>
        <Text fz="sm" c="dimmed" mt={4}>{t('state.loadingWorkspace')}</Text>
      </Paper>
    </Center>
  );

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
    if (isClientRole(userRole)) {
      setClientsData({ items: [], loading: false, error: null });
      return;
    }
    let isCancelled = false;
    fetchClients({
      counselorId: isCounselorRole(userRole) ? currentUser?.staffId ?? null : null,
    })
      .then((payload) => {
        if (isCancelled) return;
        setClientsData({ items: Array.isArray(payload?.items) ? payload.items : [], loading: false, error: null });
      })
      .catch(() => {
        if (isCancelled) return;
        setClientsData({ items: [], loading: false, error: t('clients.error.loadFailed') });
      });
    return () => { isCancelled = true; };
  }, [currentUser?.staffId, refreshClientsKey, isAuthenticated, t, userRole]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isClientRole(userRole)) {
      setOperationsSummaryData({ summary: null, loading: false, error: null });
      setMetricsData((prev) => ({
        ...prev,
        faithfulCounts: { critical: 0, moderate: 0, routine: 0 },
      }));
      return;
    }

    let cancelled = false;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    setOperationsSummaryData((current) => ({ ...current, loading: true, error: null }));

    fetchOperationsSummaryScoped({
      timezone,
      counselorId: isCounselorRole(userRole) ? currentUser?.staffId ?? null : null,
    })
      .then((payload) => {
        if (cancelled) return;
        const faithfulCounts = payload?.summary?.faithfulWorkflowCounts;
        setOperationsSummaryData({
          summary: payload?.summary ?? null,
          loading: false,
          error: null,
        });
        setMetricsData((prev) => ({
          ...prev,
          faithfulCounts: {
            critical: Number(faithfulCounts?.critical ?? 0),
            moderate: Number(faithfulCounts?.moderate ?? 0),
            routine: Number(faithfulCounts?.routine ?? 0),
          },
        }));
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
  }, [currentUser?.staffId, isAuthenticated, refreshOperationsKey, t, userRole]);

  useEffect(() => {
    if (!isAuthenticated || isClientRole(userRole) || !['dashboard', 'counselor-home'].includes(currentView)) return undefined;
    const intervalId = window.setInterval(() => {
      setRefreshOperationsKey((value) => value + 1);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [currentView, isAuthenticated, userRole]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isClientRole(userRole)) return;
    fetchAppointments({
      counselorId: isCounselorRole(userRole) ? currentUser?.staffId ?? null : null,
    })
      .then((payload) => {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const { sessions, futureAppointments, yearlyAppointments } = summarizeAppointmentMetrics(items);
        setMetricsData((prev) => ({
          ...prev,
          sessions,
          sessionsMeta: t('metrics.scheduledToday'),
          futureAppointments,
          futureAppointmentsMeta: t('metrics.scheduledAhead30'),
          yearlyAppointments,
        }));
      })
      .catch(() => {});
  }, [currentUser?.staffId, isAuthenticated, t, userRole]);

  const handleAuthContinue = (profile) => {
    const normalized = normalizeSessionUser(profile);
    setCurrentUser(normalized);
    setIsAuthenticated(true);
    setSelectedClientRequest(null);
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
    setSelectedClientRequest(null);
    setSelectedCounselorId(null);
    setCurrentView('dashboard');
    setClinicalChartState(createDefaultClinicalChartState());
    setOperationsSummaryData({ summary: null, loading: true, error: null });
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view !== 'clients') setSelectedClientRequest(null);
    if (view !== 'counselors') setSelectedCounselorId(null);
    if (view !== 'scheduling') {
      setSchedulingState({ composerOpen: false, initialClientId: null, initialView: null, initialPortalRequest: null });
    }
    if (view !== 'clinical') setClinicalChartState(createDefaultClinicalChartState());
    if (view !== 'portal') setPortalState({ initialClientId: null, initialTab: 'dashboard' });
    closeNav();
  };

  const handleOpenClinicalChart = (request = null) => {
    const normalizedRequest = typeof request === 'string'
      ? { clientId: request }
      : (request && typeof request === 'object' ? request : {});

    setClinicalChartState((currentState) => ({
      initialClientId: normalizedRequest.clientId ?? '',
      initialTab: normalizedRequest.initialTab ?? 'sessionNotes',
      initialSessionNotesComposerOpen: Boolean(normalizedRequest.initialSessionNotesComposerOpen),
      initialSessionNotesAppointmentAt: normalizedRequest.initialSessionNotesAppointmentAt ?? '',
      handoffKey: currentState.handoffKey + 1,
    }));
    setCurrentView('clinical');
    closeNav();
  };

  const handleOpenClient = (request) => {
    const normalizedRequest = typeof request === 'string'
      ? { clientId: request, initialTab: null }
      : (request && typeof request === 'object'
        ? { clientId: request.clientId ?? null, initialTab: request.initialTab ?? null }
        : { clientId: null, initialTab: null });
    if (!normalizedRequest.clientId) return;
    setCurrentView('clients');
    setSelectedClientRequest(normalizedRequest);
  };
  const handleClientBack = () => {
    setSelectedClientRequest(null);
    setCurrentView('clients');
  };
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
  const handleOpenPortal = ({ initialClientId = null, initialTab = 'dashboard' } = {}) => {
    setPortalState({ initialClientId, initialTab });
    setCurrentView('portal');
    closeNav();
  };
  const handleOpenWorkspaceStudio = (initialTab = 'portal') => {
    setWorkspaceStudioInitialTab(initialTab);
    setCurrentView('workspace-studio');
    closeNav();
  };

  const handleViewTodaySessions = () => {
    setSchedulingState({ composerOpen: false, initialClientId: null, initialView: null, initialPortalRequest: null });
    setCurrentView('scheduling');
    closeNav();
  };

  const handleViewFutureAppointments = () => {
    setSchedulingState({ composerOpen: false, initialClientId: null, initialView: null, initialPortalRequest: null });
    setCurrentView('scheduling');
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
  const showCounselorHome    = currentView === 'counselor-home';
  const showTasks            = currentView === 'tasks';
  const showUsers            = currentView === 'users';
  const showCounselors       = currentView === 'counselors';
  const showClients          = currentView === 'clients';
  const showScheduling       = currentView === 'scheduling';
  const showWorkspaceStudio  = currentView === 'workspace-studio';
  const showDocuments        = currentView === 'documents';
  const showPortal           = currentView === 'portal';
  const showOfferings        = currentView === 'offerings';
  const showClinical         = currentView === 'clinical';
  const showFaith            = currentView === 'faith';
  const showFallbackWorkspace = !showDashboard && !showCounselorHome && !showTasks && !showUsers && !showCounselors && !showClients && !showScheduling && !showWorkspaceStudio && !showDocuments && !showPortal && !showOfferings && !showClinical && !showFaith;
  const topLevelSurfaceId = !isAuthenticated
    ? 'auth'
    : selectedClientId || selectedCounselorId
      ? null
      : showCounselorHome
        ? 'counselor_home'
      : showTasks
        ? 'tasks'
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
    emptyState: ['offerings', 'faith'].includes(topLevelSurfaceId) ? 'placeholder' : null,
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
        <Suspense fallback={surfaceLoadingFallback}>
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
              initialTab={selectedClientRequest?.initialTab ?? null}
              onBack={handleClientBack}
              onOpenClientDocuments={(clientId) => handleOpenPortal({ initialClientId: clientId, initialTab: 'documents' })}
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
              onViewChart={handleOpenClinicalChart}
            />
        ) : showCounselorHome ? (
          <CounselorHomePage
            currentUser={currentUser}
            metricsData={metricsData}
            workspaceData={counselorWorkspaceData}
              onOpenScheduling={(clientId = null) => handleOpenScheduling({
                composerOpen: Boolean(clientId),
                initialClientId: clientId,
                initialView: defaultCalendarView(userRole),
            })}
            onOpenClients={() => handleNavigate('clients')}
            onOpenClient={handleOpenClient}
            onOpenClinicalChart={handleOpenClinicalChart}
            onOpenDocuments={handleOpenDocuments}
          />
        ) : showTasks ? (
          <CounselorTasksPage
            workspaceData={counselorWorkspaceData}
            onOpenClient={handleOpenClient}
            onOpenChart={handleOpenClinicalChart}
            onOpenDocuments={handleOpenDocuments}
            onOpenScheduling={(clientId) => handleOpenScheduling({
                composerOpen: true,
                initialClientId: clientId,
                initialView: defaultCalendarView(userRole),
              })}
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
              onViewClient={handleOpenClient}
            />
          ) : showDocuments ? (
            <DocumentsPage />
        ) : showClients ? (
          <ClientsPage
            clientsData={clientsData}
            intakePreviewItems={operationsSummaryData?.summary?.clientsBox?.intakePreviews?.items ?? []}
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
            <ClientPortalPage
              currentUser={currentUser}
              clients={clientsData.items}
              initialClientId={portalState.initialClientId}
              initialTab={portalState.initialTab}
              onSignOut={handleSignOut}
            />
          ) : showOfferings ? (
            <OfferingsPage clients={clientsData.items} />
          ) : showFaith ? (
            <FaithWorkflowsPage clients={clientsData.items} currentUser={currentUser} />
          ) : showClinical ? (
            <ClinicalChartPage
              clients={clientsData.items}
              currentUser={currentUser}
              initialClientId={clinicalChartState.initialClientId}
              initialTab={clinicalChartState.initialTab}
              initialSessionNotesComposerOpen={clinicalChartState.initialSessionNotesComposerOpen}
              initialSessionNotesAppointmentAt={clinicalChartState.initialSessionNotesAppointmentAt}
              handoffKey={clinicalChartState.handoffKey}
            />
          ) : (
            <>
              {showDashboard ? <Metrics data={metricsData} currentUser={currentUser} onTodaySessions={handleViewTodaySessions} onFutureAppointments={handleViewFutureAppointments} /> : null}
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
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}
