/**
 * Scenario: Scheduling workflow
 * login → list appointment types → read calendar → list appointments → logout
 *
 * Run: k6 run tests/load/k6/scenarios/04-scheduling.js
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS, JSON_PARAMS } from '../config.js';
import { loginAsAdmin, logout } from '../lib/auth.js';
import { expect2xx } from '../lib/helpers.js';

const TODAY = new Date().toISOString().slice(0, 10);
const NEXT_WEEK = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

export const options = {
  scenarios: {
    scheduling: {
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
    'http_req_duration{name:calendar}':    ['p(95)<1500'],
    'http_req_duration{name:appointments}': ['p(95)<1000'],
  },
};

export default function () {
  loginAsAdmin();

  // Appointment types reference data
  const typesRes = http.get(
    `${BASE_URL}/v1/appointment-types`,
    { ...JSON_PARAMS, tags: { name: 'appointment_types' } },
  );
  expect2xx(typesRes, 'appointment_types');

  sleep(0.3);

  // Weekly calendar view
  const calRes = http.get(
    `${BASE_URL}/v1/scheduling/calendar?start=${TODAY}&end=${NEXT_WEEK}`,
    { ...JSON_PARAMS, tags: { name: 'calendar' } },
  );
  expect2xx(calRes, 'calendar');

  sleep(0.3);

  // Appointments list
  const apptRes = http.get(
    `${BASE_URL}/v1/appointments`,
    { ...JSON_PARAMS, tags: { name: 'appointments' } },
  );
  expect2xx(apptRes, 'appointments');

  sleep(0.3);

  // Waitlist
  const waitRes = http.get(
    `${BASE_URL}/v1/waitlist`,
    { ...JSON_PARAMS, tags: { name: 'waitlist' } },
  );
  expect2xx(waitRes, 'waitlist');

  sleep(1);
  logout();
  sleep(0.5);
}
