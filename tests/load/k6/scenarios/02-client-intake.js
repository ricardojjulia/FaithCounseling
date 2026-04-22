/**
 * Scenario: Client intake workflow
 * login → create client → assign intake packet → read intake packet → logout
 *
 * Run: k6 run tests/load/k6/scenarios/02-client-intake.js
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS, JSON_PARAMS } from '../config.js';
import { loginAsAdmin, logout } from '../lib/auth.js';
import { expect2xx, uniqueTag } from '../lib/helpers.js';

export const options = {
  scenarios: {
    client_intake: {
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
    'http_req_duration{name:create_client}':  ['p(95)<1500'],
    'http_req_duration{name:create_intake}':  ['p(95)<1500'],
  },
};

export default function () {
  loginAsAdmin();

  // Create a new client
  const tag = uniqueTag();
  const clientRes = http.post(
    `${BASE_URL}/v1/clients`,
    JSON.stringify({
      firstName: `Load`,
      lastName:  `Test-${tag}`,
      status:    'active',
    }),
    { ...JSON_PARAMS, tags: { name: 'create_client' } },
  );

  const clientBody = expect2xx(clientRes, 'create_client');
  if (!clientBody) {
    logout();
    return;
  }
  const clientId = clientBody.item?.id;

  sleep(0.5);

  // Assign intake packet
  const intakeRes = http.post(
    `${BASE_URL}/v1/clients/${clientId}/intake-packets`,
    JSON.stringify({
      status:        'assigned',
      assignedForms: ['consent_to_treatment', 'intake_questionnaire'],
    }),
    { ...JSON_PARAMS, tags: { name: 'create_intake' } },
  );
  expect2xx(intakeRes, 'create_intake');

  sleep(0.5);

  // Read intake packets back
  const readRes = http.get(
    `${BASE_URL}/v1/clients/${clientId}/intake-packets`,
    { ...JSON_PARAMS, tags: { name: 'read_intake' } },
  );
  expect2xx(readRes, 'read_intake');

  sleep(0.5);

  // Read consents
  const consentRes = http.get(
    `${BASE_URL}/v1/clients/${clientId}/consents`,
    { ...JSON_PARAMS, tags: { name: 'read_consents' } },
  );
  expect2xx(consentRes, 'read_consents');

  sleep(1);
  logout();
  sleep(0.5);
}
