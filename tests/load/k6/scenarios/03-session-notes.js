/**
 * Scenario: Session notes workflow
 * login → list clients → pick one → create progress note → submit for review → logout
 *
 * Run: k6 run tests/load/k6/scenarios/03-session-notes.js
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS, JSON_PARAMS } from '../config.js';
import { loginAsAdmin, logout } from '../lib/auth.js';
import { expect2xx, randomFrom } from '../lib/helpers.js';

export const options = {
  scenarios: {
    session_notes: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '1m',  target: 3 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'http_req_duration{name:create_note}':          ['p(95)<1500'],
    'http_req_duration{name:submit_note_for_review}': ['p(95)<1500'],
  },
};

export default function () {
  loginAsAdmin();

  // List active clients
  const clientsRes = http.get(
    `${BASE_URL}/v1/clients?status=active`,
    { ...JSON_PARAMS, tags: { name: 'list_clients' } },
  );
  const clientsBody = expect2xx(clientsRes, 'list_clients');
  if (!clientsBody?.items?.length) {
    logout();
    return;
  }

  const client = randomFrom(clientsBody.items);
  sleep(0.5);

  // Read existing notes for the client
  const notesRes = http.get(
    `${BASE_URL}/v1/clients/${client.id}/progress-notes`,
    { ...JSON_PARAMS, tags: { name: 'list_notes' } },
  );
  expect2xx(notesRes, 'list_notes');

  sleep(0.5);

  // Create a new progress note
  const createRes = http.post(
    `${BASE_URL}/v1/clients/${client.id}/progress-notes`,
    JSON.stringify({
      noteType:   'progress_note',
      summary:    'Load test session: client engaged well with CBT exercises. Discussed coping strategies and reviewed weekly goals.',
      interventions: ['CBT', 'goal_setting', 'psychoeducation'],
      scriptureReference: 'Philippians 4:13',
      spiritualPractices: ['prayer', 'scripture_reflection'],
    }),
    { ...JSON_PARAMS, tags: { name: 'create_note' } },
  );

  const noteBody = expect2xx(createRes, 'create_note');
  if (!noteBody) {
    logout();
    return;
  }
  const noteId = noteBody.item?.id;

  sleep(0.5);

  // Submit note for supervisor review
  const reviewRes = http.post(
    `${BASE_URL}/v1/clients/${client.id}/progress-notes/${noteId}/submit-for-review`,
    JSON.stringify({}),
    { ...JSON_PARAMS, tags: { name: 'submit_note_for_review' } },
  );
  // 200/201 = success, 409 = already pending (acceptable in concurrent load)
  const reviewOk = reviewRes.status === 200 || reviewRes.status === 201 || reviewRes.status === 409;
  if (!reviewOk) {
    expect2xx(reviewRes, 'submit_note_for_review');
  }

  sleep(1);
  logout();
  sleep(0.5);
}
