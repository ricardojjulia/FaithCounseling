import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Box, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';
import { useI18n } from '../../lib/i18nContext.jsx';
import SafetyBanner from './SafetyBanner.jsx';
import ClientRankList from './ClientRankList.jsx';
import WorkflowCanvas from './WorkflowCanvas.jsx';
import RecommendationDrawer from './RecommendationDrawer.jsx';
import { runWorkflow, buildClientRankEntry, buildLightweightRankEntry } from './engine/runWorkflow.js';
import { getMockClientData, MOCK_CLIENTS } from './engine/mockData.js';

/**
 * Fetches enriched client workflow data from the API.
 * Falls back to mock data if the client ID is a mock ID.
 */
async function fetchClientWorkflowData(clientId) {
  // Use mock data for demo clients
  const mockData = getMockClientData(clientId);
  if (mockData) return mockData;

  // Parallel fetch of all data sources
  const [
    clientRes,
    diagnosesRes,
    notesRes,
    planRes,
    faithRes,
    appointmentsRes,
    assessmentsRes,
  ] = await Promise.allSettled([
    fetch(`/api/v1/clients/${encodeURIComponent(clientId)}`,                    { credentials: 'include' }).then((r) => r.ok ? r.json() : null),
    fetch(`/api/v1/clients/${encodeURIComponent(clientId)}/diagnoses`,          { credentials: 'include' }).then((r) => r.ok ? r.json() : null),
    fetch(`/api/v1/clients/${encodeURIComponent(clientId)}/progress-notes`,     { credentials: 'include' }).then((r) => r.ok ? r.json() : null),
    fetch(`/api/v1/clients/${encodeURIComponent(clientId)}/treatment-plan`,     { credentials: 'include' }).then((r) => r.ok ? r.json() : null),
    fetch(`/api/v1/clients/${encodeURIComponent(clientId)}/faith-profile`,      { credentials: 'include' }).then((r) => r.ok ? r.json() : null),
    fetch(`/api/v1/appointments?clientId=${encodeURIComponent(clientId)}`,      { credentials: 'include' }).then((r) => r.ok ? r.json() : null),
    fetch(`/api/v1/forms/client-overview?clientId=${encodeURIComponent(clientId)}`, { credentials: 'include' }).then((r) => r.ok ? r.json() : null),
  ]);

  const val = (settled) => settled.status === 'fulfilled' ? settled.value : null;

  const clientData = val(clientRes);
  return {
    client: clientData?.item ?? clientData ?? { id: clientId },
    diagnoses: val(diagnosesRes)?.items ?? [],
    progressNotes: val(notesRes)?.items ?? [],
    treatmentPlan: val(planRes)?.item ?? val(planRes) ?? null,
    faithProfile: val(faithRes)?.item ?? val(faithRes) ?? null,
    appointments: val(appointmentsRes)?.items ?? [],
    assessments: val(assessmentsRes)?.assessments ?? val(assessmentsRes)?.items ?? [],
    status: 'ready',
    errorMessage: null,
  };
}

/**
 * Faithful Workflows — main three-panel page.
 *
 * Props:
 *   clients     — basic client list from App.jsx (already loaded)
 *   currentUser — session user
 */
export default function FaithWorkflowsPage({ clients = [], currentUser }) {
  const { t } = useI18n();
  useSurfaceTelemetry('faith_workflows', { surfaceKind: 'view', workflow: 'faith_workflows' });

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedRec, setSelectedRec] = useState(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  // Cache of enriched ClientWorkflowData keyed by clientId
  const [dataCache, setDataCache] = useState({});
  // rec status overrides keyed by rec.id
  const [statusOverrides, setStatusOverrides] = useState({});
  // Loading state per clientId
  const [loadingSet, setLoadingSet] = useState(new Set());
  const [loadError, setLoadError] = useState(null);

  // ─── Build client rank entries from basic list + cached enriched data ──────
  const rankEntries = useMemo(() => {
    // Start with mock clients + real clients from prop
    const allClients = [
      // Include mock clients in dev/demo mode
      ...MOCK_CLIENTS.map((m) => m.client),
      ...clients.filter((c) => !c.id.startsWith('mock-')),
    ];

    return allClients
      .map((c) => {
        const cached = dataCache[c.id];
        if (cached) {
          const entry = buildClientRankEntry(cached);
          // Apply status overrides to recs
          const recs = entry.recommendations.map((r) => ({
            ...r,
            status: statusOverrides[r.id] ?? r.status,
          }));
          return { ...entry, recommendations: recs, recommendationCount: recs.filter((r) => r.status === 'pending').length };
        }
        return buildLightweightRankEntry(c);
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [clients, dataCache, statusOverrides]);

  const hasCriticalClient = rankEntries.some((e) => e.urgencyLevel === 'critical');

  // ─── Selected client data ─────────────────────────────────────────────────
  const selectedEntry = rankEntries.find((e) => e.clientId === selectedClientId) ?? null;
  const selectedClientData = selectedClientId ? dataCache[selectedClientId] : null;

  // ─── Load enriched data when a client is selected ─────────────────────────
  useEffect(() => {
    if (!selectedClientId) return;
    if (dataCache[selectedClientId]) return;
    if (loadingSet.has(selectedClientId)) return;

    setLoadingSet((prev) => new Set([...prev, selectedClientId]));
    setLoadError(null);

    fetchClientWorkflowData(selectedClientId)
      .then((data) => {
        setDataCache((prev) => ({ ...prev, [selectedClientId]: data }));
      })
      .catch((err) => {
        setLoadError(err.message ?? 'Unable to load client data');
      })
      .finally(() => {
        setLoadingSet((prev) => { const next = new Set(prev); next.delete(selectedClientId); return next; });
      });
  }, [selectedClientId, dataCache, loadingSet]);

  // Pre-load mock clients on mount
  useEffect(() => {
    MOCK_CLIENTS.forEach((m) => {
      const id = m.client.id;
      if (!dataCache[id]) {
        setDataCache((prev) => ({ ...prev, [id]: m }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Derived recommendations for selected client ──────────────────────────
  const recommendations = useMemo(() => {
    if (!selectedClientData) return [];
    const recs = runWorkflow(selectedClientData);
    return recs.map((r) => ({ ...r, status: statusOverrides[r.id] ?? r.status }));
  }, [selectedClientData, statusOverrides]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectClient = useCallback((clientId) => {
    setSelectedClientId(clientId);
    setSelectedRec(null);
    closeDrawer();
  }, [closeDrawer]);

  const handleSelectRec = useCallback((rec) => {
    setSelectedRec(rec);
    openDrawer();
  }, [openDrawer]);

  const handleStatusChange = useCallback((recId, status) => {
    setStatusOverrides((prev) => ({ ...prev, [recId]: status }));
    // If the drawer's rec was hidden, close drawer
    if (selectedRec?.id === recId && status === 'hidden') {
      closeDrawer();
      setSelectedRec(null);
    }
  }, [selectedRec, closeDrawer]);

  const handleAction = useCallback((rec, actionType) => {
    // Status actions handled in WorkflowNode directly; non-status actions open drawer
    if (['mark_complete', 'defer', 'hide'].includes(actionType)) {
      handleStatusChange(rec.id, actionType === 'mark_complete' ? 'complete' : actionType);
    } else {
      setSelectedRec(rec);
      openDrawer();
    }
  }, [handleStatusChange, openDrawer]);

  const isLoadingSelected = selectedClientId && loadingSet.has(selectedClientId);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Stack gap={0} style={{ height: '100%', minHeight: 0, flex: 1, overflow: 'hidden' }}>
      {/* Page header */}
      <Box p="md" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>{t('workflow.title')}</Title>
            <Text c="dimmed" size="sm">{t('workflow.subtitle')}</Text>
          </div>
        </Group>
      </Box>

      {/* Safety banner — always visible */}
      <Box style={{ flexShrink: 0 }}>
        <SafetyBanner hasCriticalClient={hasCriticalClient} />
      </Box>

      {/* Three-panel layout */}
      <Group gap={0} align="stretch" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left panel — client list */}
        <Box style={{ width: 280, minWidth: 220, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ClientRankList
            entries={rankEntries}
            selectedId={selectedClientId}
            onSelect={handleSelectClient}
            loading={false}
          />
        </Box>

        {/* Center panel — workflow canvas */}
        <Box style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--mantine-color-default-border)' }}>
          {!selectedClientId ? (
            <Stack align="center" justify="center" style={{ flex: 1 }} gap="sm">
              <Text size="xl">🗺</Text>
              <Text c="dimmed" size="sm" ta="center" maw={320}>{t('workflow.selectClient')}</Text>
            </Stack>
          ) : isLoadingSelected ? (
            <Stack align="center" justify="center" style={{ flex: 1 }} gap="sm">
              <Loader size="sm" />
              <Text c="dimmed" size="sm">{t('workflow.loading')}</Text>
            </Stack>
          ) : loadError ? (
            <Box p="md">
              <Alert color="red" variant="light">{loadError}</Alert>
            </Box>
          ) : (
            <WorkflowCanvas
              client={selectedClientData?.client}
              recommendations={recommendations}
              urgencyScore={selectedEntry?.urgencyScore ?? 0}
              urgencyLevel={selectedEntry?.urgencyLevel ?? 'routine'}
              diagnosisSummary={selectedEntry?.diagnosisSummary ?? ''}
              trend={selectedEntry?.trend ?? 'unknown'}
              selectedRecId={selectedRec?.id}
              onSelectRec={handleSelectRec}
              onAction={handleAction}
              onStatusChange={handleStatusChange}
            />
          )}
        </Box>

        {/* Right panel — placeholder when drawer is closed on wider screens */}
        {!drawerOpened && selectedRec && (
          <Box
            style={{
              width: 280,
              flexShrink: 0,
              borderLeft: '1px solid var(--mantine-color-default-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text c="dimmed" size="xs" ta="center" px="md">
              Select a recommendation to view details
            </Text>
          </Box>
        )}
      </Group>

      {/* Detail drawer */}
      <RecommendationDrawer
        rec={selectedRec}
        client={selectedClientData?.client}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Stack>
  );
}
