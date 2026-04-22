/**
 * Scenario: Full counselor workflow (composite)
 *
 * Simulates a counselor's complete session day:
 * login → dashboard → calendar → pick client → chart review →
 * create session note → billing lookups → operations summary → logout
 *
 * This is the highest-value scenario for performance baseline.
 * Run: k6 run tests/load/k6/scenarios/06-full-workflow.js
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS, JSON_PARAMS } from '../config.js';
import { loginAsAdmin, logout } from '../lib/auth.js';
import { expect2xx, randomFrom, uniqueTag } from '../lib/helpers.js';

const TODAY      = new Date().toISOString().slice(0, 10);
const NEXT_WEEK  = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

export const options = {
  scenarios: {
    full_counselor_workflow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5  },
        { duration: '2m',  target: 10 },
        { duration: '1m',  target: 10 },
        { duration: '30s', target: 0  },
      ],
    },
  },
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'http_req_duration{name:dashboard}':   ['p(95)<1000'],
    'http_req_duration{name:calendar}':    ['p(95)<1500'],
    'http_req_duration{name:create_note}': ['p(95)<2000'],
  },
};

export default function () {
  // ── 1. Login ─────────────────────────────────────────────────────────────
  loginAsAdmin();

  // ── 2. Dashboard / operations summary ────────────────────────────────────
  const dashRes = http.get(
    `${BASE_URL}/v1/operations/summary`,
    { ...JSON_PARAMS, tags: { name: 'dashboard' } },
  );
  expect2xx(dashRes, 'dashboard');
  sleep(0.5);

  // ── 3. Calendar view for today's schedule ────────────────────────────────
  const calRes = http.get(
    `${BASE_URL}/v1/scheduling/calendar?start=${TODAY}&end=${NEXT_WEEK}`,
    { ...JSON_PARAMS, tags: { name: 'calendar' } },
  );
  expect2xx(calRes, 'calendar');
  sleep(0.5);

  // ── 4. List active clients ────────────────────────────────────────────────
  const clientsRes = http.get(
    `${BASE_URL}/v1/clients?status=active`,
    { ...JSON_PARAMS, tags: { name: 'list_clients' } },
  );
  const clientsBody = expect2xx(clientsRes, 'list_clients');
  sleep(0.5);

  let clientId;

  if (clientsBody?.items?.length) {
    // ── 5a. Use existing client — chart review ──────────────────────────────
    const client = randomFrom(clientsBody.items);
    clientId = client.id;

    // Progress notes
    const notesRes = http.get(
      `${BASE_URL}/v1/clients/${clientId}/progress-notes`,
      { ...JSON_PARAMS, tags: { name: 'chart_notes' } },
    );
    expect2xx(notesRes, 'chart_notes');
    sleep(0.3);

    // Treatment plan
    const tpRes = http.get(
      `${BASE_URL}/v1/clients/${clientId}/treatment-plan`,
      { ...JSON_PARAMS, tags: { name: 'treatment_plan' } },
    );
    expect2xx(tpRes, 'treatment_plan');
    sleep(0.3);

    // Intake packets
    const intakeRes = http.get(
      `${BASE_URL}/v1/clients/${clientId}/intake-packets`,
      { ...JSON_PARAMS, tags: { name: 'intake_status' } },
    );
    expect2xx(intakeRes, 'intake_status');
    sleep(0.5);

  } else {
    // ── 5b. No seeded clients — create one ──────────────────────────────────
    const tag = uniqueTag();
    const createRes = http.post(
      `${BASE_URL}/v1/clients`,
      JSON.stringify({ firstName: 'Load', lastName: `Test-${tag}`, status: 'active' }),
      { ...JSON_PARAMS, tags: { name: 'create_client' } },
    );
    const body = expect2xx(createRes, 'create_client');
    clientId = body?.item?.id;
    sleep(0.5);
  }

  // ── 6. Write session note ─────────────────────────────────────────────────
  if (clientId) {
    const noteRes = http.post(
      `${BASE_URL}/v1/clients/${clientId}/progress-notes`,
      JSON.stringify({
        noteType:  'progress_note',
        summary:   'Counselor reviewed CBT homework. Client showed progress in anxiety management. Discussed spiritual resilience using Psalm 23 as framework.',
        interventions:      ['CBT', 'spiritual_direction', 'mindfulness'],
        scriptureReference: 'Psalm 23',
        spiritualPractices: ['prayer', 'journaling'],
      }),
      { ...JSON_PARAMS, tags: { name: 'create_note' } },
    );
    expect2xx(noteRes, 'create_note');
    sleep(0.5);
  }

  // ── 7. Billing reference lookup ───────────────────────────────────────────
  const codesRes = http.get(
    `${BASE_URL}/v1/billing/service-codes`,
    { ...JSON_PARAMS, tags: { name: 'service_codes' } },
  );
  expect2xx(codesRes, 'service_codes');
  sleep(0.3);

  // ── 8. Faith overview ─────────────────────────────────────────────────────
  const faithRes = http.get(
    `${BASE_URL}/v1/faith/overview`,
    { ...JSON_PARAMS, tags: { name: 'faith_overview' } },
  );
  expect2xx(faithRes, 'faith_overview');
  sleep(0.3);

  // ── 9. Logout ─────────────────────────────────────────────────────────────
  sleep(1);
  logout();
  sleep(0.5);
}
