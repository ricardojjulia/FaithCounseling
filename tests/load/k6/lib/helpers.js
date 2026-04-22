import { check } from 'k6';

/**
 * Parse JSON body or fail loudly so scenarios get useful errors.
 */
export function parseBody(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

/**
 * Assert a 2xx response and return parsed body.
 * Returns null if the check fails (lets the scenario decide whether to abort).
 */
export function expect2xx(res, label) {
  const ok = check(res, {
    [`${label} 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  return ok ? parseBody(res) : null;
}

/**
 * Random element from an array — useful for picking existing clients/staff.
 */
export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Unique-ish suffix for test-generated names so rows don't collide across VUs.
 */
export function uniqueTag() {
  return `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}
