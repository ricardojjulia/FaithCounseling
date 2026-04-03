import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ActionIcon, Alert, Box, Group, Loader, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';
import { frontendTelemetry } from '../../lib/frontendTelemetry.js';
import { useI18n } from '../../lib/i18nContext.jsx';
import SafetyBanner from './SafetyBanner.jsx';
import ClientRankList from './ClientRankList.jsx';
import WorkflowCanvas from './WorkflowCanvas.jsx';
import WorkflowCanvasRadial from './WorkflowCanvasRadial.jsx';
import WorkflowCanvasPriority from './WorkflowCanvasPriority.jsx';
import RecommendationDrawer from './RecommendationDrawer.jsx';
import { runWorkflow, buildClientRankEntry, buildLightweightRankEntry } from './engine/runWorkflow.js';
import { getMockClientData, MOCK_CLIENTS } from './engine/mockData.js';

// ─── View variant metadata ────────────────────────────────────────────────────

const VARIANT_ICONS = {
  classic:  '≡',
  radial:   '⊙',
  priority: '⊞',
};

const VARIANT_COLORS = {
  classic:  'gray',
  radial:   'blue',
  priority: 'violet',
};

const VARIANT_LABELS = {
  classic:  'Classic List — click for Radial Hub',
  radial:   'Radial Hub — click for Priority Matrix',
  priority: 'Priority Matrix — click for Classic List',
};

const FAITH_WORKFLOW_DEMO_STORAGE_KEY = 'faith_workflows.demo_mode';

function readOptionalBoolean(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

function isFaithWorkflowDemoEnabled() {
  try {
    const stored = readOptionalBoolean(window.localStorage.getItem(FAITH_WORKFLOW_DEMO_STORAGE_KEY));
    if (stored !== null) return stored;
  } catch {
    // localStorage is optional for this feature flag
  }

  return readOptionalBoolean(import.meta.env?.VITE_ENABLE_FAITH_WORKFLOWS_DEMO) ?? false;
}

/**
 * Fetches enriched client workflow data from the API.
 * Falls back to mock data if the client ID is a mock ID.
 */
async function fetchClientWorkflowData(clientId, demoModeEnabled) {
  // Use mock data for demo clients
  const mockData = demoModeEnabled ? getMockClientData(clientId) : null;
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

  // The client-overview endpoint returns `submissions` (all form submissions for the client).
  // Map each to the shape the rules engine expects:
  //   inventoryName / title  → for getLatestAssessment name matching (e.g. 'PHQ-9', 'GAD-7')
  //   score                  → numeric score value
  //   scoredAt / completedAt → ISO date string for recency comparisons
  //   item9Score             → PHQ-9 question 9 (suicidal ideation) from responses.selfHarm
  const rawSubmissions = val(assessmentsRes)?.submissions ?? [];
  const assessments = rawSubmissions
    .filter((sub) => sub.scoreValue != null)
    .map((sub) => ({
      ...sub,
      inventoryName: sub.formTitle ?? sub.formKey ?? '',
      title: sub.formTitle ?? sub.formKey ?? '',
      score: sub.scoreValue != null ? Number(sub.scoreValue) : null,
      scoredAt: sub.submittedAt ?? null,
      completedAt: sub.submittedAt ?? null,
      item9Score: sub.responses?.item9Score ?? sub.responses?.selfHarm ?? null,
    }));

  return {
    client: clientData?.item ?? clientData ?? { id: clientId },
    diagnoses: val(diagnosesRes)?.items ?? [],
    progressNotes: val(notesRes)?.items ?? [],
    treatmentPlan: val(planRes)?.item ?? val(planRes) ?? null,
    faithProfile: val(faithRes)?.item ?? val(faithRes) ?? null,
    appointments: val(appointmentsRes)?.items ?? [],
    assessments,
    status: 'ready',
    errorMessage: null,
  };
}

/**
 * Load persisted recommendation states for a real client from the API.
 * Returns a map of ruleId → status for merging into runWorkflow output.
 * Mock clients skip this — they always start fresh.
 */
async function fetchPersistedStates(clientId) {
  if (clientId.startsWith('mock-')) return {};
  try {
    const res = await fetch(
      `/api/v1/workflows/recommendations/state?clientId=${encodeURIComponent(clientId)}`,
      { credentials: 'include' },
    );
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    for (const s of data.states ?? []) {
      map[s.ruleId] = { status: s.status, deferredUntil: s.deferredUntil ?? null, stateId: s.id };
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Persist a status change for a recommendation to the API.
 * Silently no-ops for mock clients.
 */
async function persistStateChange(clientId, ruleId, status, deferredUntil = null) {
  if (clientId.startsWith('mock-')) return;
  try {
    await fetch('/api/v1/workflows/recommendations/state', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, ruleId, status, deferredUntil }),
    });
  } catch {
    // Non-fatal: UI state is already updated optimistically
  }
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
  const demoModeEnabled = useMemo(() => isFaithWorkflowDemoEnabled(), []);

  // ─── Canvas view variant ─────────────────────────────────────────────────
  const [variant, setVariant] = useState(() => {
    try { return localStorage.getItem('fw_view_variant') ?? 'classic'; } catch { return 'classic'; }
  });
  const VARIANTS = ['classic', 'radial', 'priority'];
  const cycleVariant = useCallback(() => {
    setVariant((v) => {
      const next = VARIANTS[(VARIANTS.indexOf(v) + 1) % VARIANTS.length];
      try { localStorage.setItem('fw_view_variant', next); } catch {}
      return next;
    });
  }, []);

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedRec, setSelectedRec] = useState(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  // Cache of enriched ClientWorkflowData keyed by clientId
  const [dataCache, setDataCache] = useState({});
  // Persisted rec status overrides keyed by ruleId — loaded from API, updated optimistically
  // Shape: { [ruleId]: { status, deferredUntil, stateId } }
  const [persistedStates, setPersistedStates] = useState({});
  // Loading state per clientId
  const [loadingSet, setLoadingSet] = useState(new Set());
  const [loadError, setLoadError] = useState(null);

  // ─── Build client rank entries from basic list + cached enriched data ──────
  const rankEntries = useMemo(() => {
    const allClients = [
      ...(demoModeEnabled ? MOCK_CLIENTS.map((m) => m.client) : []),
      ...clients.filter((c) => !c.id.startsWith('mock-')),
    ];

    return allClients
      .map((c) => {
        const cached = dataCache[c.id];
        if (cached) {
          const entry = buildClientRankEntry(cached);
          const recs = applyPersistedStates(entry.recommendations, persistedStates, c.id === selectedClientId);
          return { ...entry, recommendations: recs, recommendationCount: recs.filter((r) => r.status === 'pending').length };
        }
        return buildLightweightRankEntry(c);
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [clients, dataCache, demoModeEnabled, persistedStates, selectedClientId]);

  const urgencyCounts = useMemo(() => {
    const counts = { critical: 0, moderate: 0, routine: 0 };
    for (const e of rankEntries) {
      if (e.urgencyLevel === 'critical') counts.critical++;
      else if (e.urgencyLevel === 'high' || e.urgencyLevel === 'moderate') counts.moderate++;
      else counts.routine++;
    }
    return counts;
  }, [rankEntries]);

  // ─── Selected client data ─────────────────────────────────────────────────
  const selectedEntry = rankEntries.find((e) => e.clientId === selectedClientId) ?? null;
  const selectedClientData = selectedClientId ? dataCache[selectedClientId] : null;

  // ─── Load enriched data + persisted states when a client is selected ───────
  useEffect(() => {
    if (!selectedClientId) return;
    if (dataCache[selectedClientId]) return;
    if (loadingSet.has(selectedClientId)) return;

    setLoadingSet((prev) => new Set([...prev, selectedClientId]));
    setLoadError(null);

    Promise.all([
      fetchClientWorkflowData(selectedClientId, demoModeEnabled),
      fetchPersistedStates(selectedClientId),
    ])
      .then(([data, states]) => {
        setDataCache((prev) => ({ ...prev, [selectedClientId]: data }));
        setPersistedStates((prev) => ({ ...prev, ...states }));
      })
      .catch((err) => {
        setLoadError(err.message ?? 'Unable to load client data');
      })
      .finally(() => {
        setLoadingSet((prev) => { const next = new Set(prev); next.delete(selectedClientId); return next; });
      });
  }, [selectedClientId, dataCache, demoModeEnabled, loadingSet]);

  // Pre-load mock clients on mount
  useEffect(() => {
    if (!demoModeEnabled) return;
    MOCK_CLIENTS.forEach((m) => {
      const id = m.client.id;
      if (!dataCache[id]) {
        setDataCache((prev) => ({ ...prev, [id]: m }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoModeEnabled]);

  // ─── Derived recommendations for selected client ──────────────────────────
  const recommendations = useMemo(() => {
    if (!selectedClientData) return [];
    const recs = runWorkflow(selectedClientData);
    return applyPersistedStates(recs, persistedStates, true);
  }, [selectedClientData, persistedStates]);

  // ─── Track recommendation surface count per client (for telemetry) ──────────
  const lastSurfacedRef = useRef(null);

  // Emit telemetry when the recommendations list changes for the selected client
  useEffect(() => {
    if (!selectedClientId || recommendations.length === 0) return;

    const key = `${selectedClientId}:${recommendations.length}`;
    if (lastSurfacedRef.current === key) return;
    lastSurfacedRef.current = key;

    const safetyCount = recommendations.filter((r) => r.category === 'safety').length;
    frontendTelemetry.trackAction(
      'faith_workflows',
      'recommendations_surfaced',
      'success',
      {
        workflow: 'faith_workflows',
        // statusClass carries the count band — no PHI, no IDs
        statusClass: safetyCount > 0 ? 'with_safety' : 'no_safety',
      },
    );
  }, [selectedClientId, recommendations]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectClient = useCallback((clientId) => {
    frontendTelemetry.trackInteraction('faith_workflows', 'client_selected', 0, { workflow: 'faith_workflows' });
    setSelectedClientId(clientId);
    setSelectedRec(null);
    closeDrawer();
  }, [closeDrawer]);

  const handleSelectRec = useCallback((rec) => {
    frontendTelemetry.trackInteraction('faith_workflows', 'recommendation_opened', 0, {
      workflow: 'faith_workflows',
      // category only — no client ID, no personal data
      statusClass: rec?.category ?? 'unknown',
    });
    setSelectedRec(rec);
    openDrawer();
  }, [openDrawer]);

  const handleStatusChange = useCallback((rec, status, deferredUntil = null) => {
    frontendTelemetry.trackAction('faith_workflows', `recommendation_${status}`, 'success', {
      workflow: 'faith_workflows',
      statusClass: rec?.category ?? 'unknown',
    });
    // Optimistic UI update
    setPersistedStates((prev) => ({
      ...prev,
      [rec.ruleId]: { status, deferredUntil, stateId: prev[rec.ruleId]?.stateId ?? null },
    }));
    // Update the drawer's selected rec if it's the same one
    if (selectedRec?.id === rec.id) {
      setSelectedRec((r) => r ? { ...r, status } : r);
    }
    // If hidden, close drawer
    if (status === 'hidden' && selectedRec?.id === rec.id) {
      closeDrawer();
      setSelectedRec(null);
    }
    // Persist to API
    persistStateChange(selectedClientId, rec.ruleId, status, deferredUntil);
  }, [selectedRec, closeDrawer, selectedClientId]);

  const handleAction = useCallback((rec, actionType) => {
    frontendTelemetry.trackAction('faith_workflows', `action_${actionType}`, 'success', {
      workflow: 'faith_workflows',
      statusClass: rec?.category ?? 'unknown',
    });
    if (actionType === 'mark_complete') {
      handleStatusChange(rec, 'complete');
    } else if (actionType === 'hide') {
      handleStatusChange(rec, 'hidden');
    } else {
      // For defer and content-generating actions, open the drawer
      setSelectedRec(rec);
      openDrawer();
    }
  }, [handleStatusChange, openDrawer]);

  const handleShowMoreClients = useCallback(({ remaining = 0, total = 0 } = {}) => {
    frontendTelemetry.trackAction('faith_workflows', 'show_more_clients', 'success', {
      workflow: 'faith_workflows',
      statusClass: classifyCountBand(total),
    });
    frontendTelemetry.trackInteraction('faith_workflows', 'client_list_growth', 0, {
      workflow: 'faith_workflows',
      statusClass: remaining > 0 ? 'partial' : 'complete',
    });
  }, []);

  const handleToggleCategory = useCallback((category, expanded) => {
    frontendTelemetry.trackAction('faith_workflows', expanded ? 'category_expanded' : 'category_collapsed', 'success', {
      workflow: 'faith_workflows',
      statusClass: String(category || 'unknown').slice(0, 40).toLowerCase(),
    });
  }, []);

  const isLoadingSelected = selectedClientId && loadingSet.has(selectedClientId);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Stack gap={0} style={{ height: '100%', minHeight: 0, flex: 1, overflow: 'hidden' }} data-testid="faith-workflows-page">
      {/* Page header */}
      <Box p="md" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}>
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>{t('workflow.title')}</Title>
            <Text c="dimmed" size="sm">{t('workflow.subtitle')}</Text>
          </div>

          {/* View picker — always visible in the header */}
          <Tooltip label={VARIANT_LABELS[variant]} withArrow position="bottom">
            <ActionIcon
              size="lg"
              variant="light"
              color={VARIANT_COLORS[variant]}
              radius="xl"
              onClick={cycleVariant}
              aria-label={VARIANT_LABELS[variant]}
            >
              <Text size="sm" style={{ lineHeight: 1 }}>
                {VARIANT_ICONS[variant]}
              </Text>
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>

      {/* Safety banner — always visible */}
      <Box style={{ flexShrink: 0 }}>
        <SafetyBanner urgencyCounts={urgencyCounts} />
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
            onShowMore={handleShowMoreClients}
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
          ) : variant === 'radial' ? (
            <WorkflowCanvasRadial
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
              onToggleCategory={handleToggleCategory}
            />
          ) : variant === 'priority' ? (
            <WorkflowCanvasPriority
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
              onToggleCategory={handleToggleCategory}
            />
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
              onToggleCategory={handleToggleCategory}
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
        allRecommendations={recommendations}
        opened={drawerOpened}
        onClose={closeDrawer}
        onStatusChange={handleStatusChange}
        onAction={handleAction}
      />
    </Stack>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SAFETY_LOCK_THRESHOLD = 9;

/**
 * Merge persisted DB states into the rules engine output.
 * Safety lock: any rec with priority >= SAFETY_LOCK_THRESHOLD cannot stay hidden/deferred.
 *
 * @param {import('./engine/types.js').Recommendation[]} recs
 * @param {Record<string, {status: string}>} states  — keyed by ruleId
 * @param {boolean} applyStates  — false for non-selected clients (skip merge)
 */
function applyPersistedStates(recs, states, applyStates) {
  if (!applyStates) return recs;
  return recs.map((rec) => {
    const persisted = states[rec.ruleId];
    if (!persisted) return rec;
    let status = persisted.status;
    // Safety lock: high-priority recommendations cannot be hidden or deferred
    if (rec.priority >= SAFETY_LOCK_THRESHOLD && (status === 'hidden' || status === 'deferred')) {
      status = 'pending';
    }
    return { ...rec, status };
  });
}

function classifyCountBand(total) {
  if (total >= 150) return '150_plus';
  if (total >= 100) return '100_149';
  if (total >= 50) return '50_99';
  if (total >= 20) return '20_49';
  return 'under_20';
}
