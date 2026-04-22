/**
 * Scenario: Billing workflow
 * login → service codes → fee schedules → invoices → aging report → logout
 *
 * Run: k6 run tests/load/k6/scenarios/05-billing.js
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS, JSON_PARAMS } from '../config.js';
import { loginAsAdmin, logout } from '../lib/auth.js';
import { expect2xx } from '../lib/helpers.js';

export const options = {
  scenarios: {
    billing: {
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
    'http_req_duration{name:invoices}':      ['p(95)<1500'],
    'http_req_duration{name:aging_report}':  ['p(95)<2000'],
  },
};

export default function () {
  loginAsAdmin();

  const serviceCodes = http.get(
    `${BASE_URL}/v1/billing/service-codes`,
    { ...JSON_PARAMS, tags: { name: 'service_codes' } },
  );
  expect2xx(serviceCodes, 'service_codes');

  sleep(0.3);

  const feeSchedules = http.get(
    `${BASE_URL}/v1/billing/fee-schedules`,
    { ...JSON_PARAMS, tags: { name: 'fee_schedules' } },
  );
  expect2xx(feeSchedules, 'fee_schedules');

  sleep(0.3);

  const invoices = http.get(
    `${BASE_URL}/v1/billing/invoices`,
    { ...JSON_PARAMS, tags: { name: 'invoices' } },
  );
  expect2xx(invoices, 'invoices');

  sleep(0.3);

  const claims = http.get(
    `${BASE_URL}/v1/billing/claims`,
    { ...JSON_PARAMS, tags: { name: 'claims' } },
  );
  expect2xx(claims, 'claims');

  sleep(0.3);

  const aging = http.get(
    `${BASE_URL}/v1/billing/reports/aging`,
    { ...JSON_PARAMS, tags: { name: 'aging_report' } },
  );
  expect2xx(aging, 'aging_report');

  sleep(1);
  logout();
  sleep(0.5);
}
