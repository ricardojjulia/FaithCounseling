/**
 * Scenario: Auth flow
 * login → GET /v1/auth/me → GET /v1/auth/status → logout
 *
 * Run: k6 run tests/load/k6/scenarios/01-auth.js
 */
import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS, JSON_PARAMS } from '../config.js';
import { loginAsAdmin, logout } from '../lib/auth.js';

export const options = {
  scenarios: {
    auth_flow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m',  target: 5 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'http_req_duration{name:login}':  ['p(95)<1000'],
    'http_req_duration{name:auth_me}': ['p(95)<500'],
  },
};

export default function () {
  loginAsAdmin();

  const meRes = http.get(`${BASE_URL}/v1/auth/me`, {
    ...JSON_PARAMS,
    tags: { name: 'auth_me' },
  });
  check(meRes, {
    'auth/me 200':       (r) => r.status === 200,
    'auth/me has email': (r) => {
      try { return Boolean(JSON.parse(r.body).email); } catch { return false; }
    },
  });

  const statusRes = http.get(`${BASE_URL}/v1/auth/status`, JSON_PARAMS);
  check(statusRes, {
    'auth/status authenticated': (r) => {
      try { return JSON.parse(r.body).authenticated === true; } catch { return false; }
    },
  });

  sleep(1);
  logout();
  sleep(0.5);
}
