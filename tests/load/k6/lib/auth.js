import http from 'k6/http';
import { check, fail } from 'k6';
import { BASE_URL, CREDENTIALS, JSON_PARAMS } from '../config.js';

/**
 * Log in with staff admin credentials.
 * Returns the profile object; session cookie is stored in the VU cookie jar automatically.
 */
export function loginAsAdmin() {
  return _login(CREDENTIALS.admin);
}

/**
 * Log in as the demo client portal user.
 */
export function loginAsClient() {
  return _login(CREDENTIALS.client);
}

function _login({ email, password }) {
  const res = http.post(
    `${BASE_URL}/v1/auth/login`,
    JSON.stringify({ email, password }),
    JSON_PARAMS,
  );

  const ok = check(res, {
    'login 200': (r) => r.status === 200,
    'login returns profile': (r) => {
      try { return Boolean(JSON.parse(r.body).profile); } catch { return false; }
    },
  });

  if (!ok) fail(`Login failed for ${email}: ${res.status} ${res.body}`);

  return JSON.parse(res.body).profile;
}

export function logout() {
  const res = http.post(`${BASE_URL}/v1/auth/logout`, null, JSON_PARAMS);
  check(res, { 'logout 200': (r) => r.status === 200 });
}
