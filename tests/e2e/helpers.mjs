import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/**
 * Test credentials used by E2E tests.
 * These accounts must exist in the DB (created by the migration seed).
 * Override via env vars when additional seeded users exist.
 */
const TEST_ACCOUNTS = {
  practice_admin: {
    email:    process.env.TEST_ADMIN_EMAIL    || 'admin@faithcounseling.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'ChangeMe!Dev2024#',
  },
  client: {
    email: process.env.TEST_CLIENT_EMAIL || 'sarah.kim@example.test',
    password: process.env.TEST_CLIENT_PASSWORD || 'ChangeMe!Client2026#',
  },
};

export function getTestAccount(role) {
  return TEST_ACCOUNTS[role];
}

export async function signInWithCredentials(page, { email, password }) {
  await expect(page.locator('#loginEmail')).toBeVisible({ timeout: 10000 });
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', password);
  await page.click('button[type="submit"]');
  await expect(page.locator('#authGate')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('.workspace-topbar')).toBeVisible({ timeout: 5000 });
}

/**
 * Sign in via the real login form.
 *
 * Falls back to the legacy role-selector flow when the login form is not
 * present (i.e. when running against an API without a database configured),
 * so existing CI pipelines that don't set up MySQL continue to work.
 */
export async function signInAs(page, role) {
  await page.goto('/');

  const authMode = await expect.poll(async () => {
    if (await page.locator('#userBadge').isVisible().catch(() => false)) return 'session';
    if (await page.locator('#loginEmail').isVisible().catch(() => false)) return 'login';
    if (await page.locator('#roleSelect').isVisible().catch(() => false)) return 'legacy';
    return 'loading';
  }, { timeout: 10000 }).not.toBe('loading').then(async () => {
    if (await page.locator('#userBadge').isVisible().catch(() => false)) return 'session';
    if (await page.locator('#loginEmail').isVisible().catch(() => false)) return 'login';
    if (await page.locator('#roleSelect').isVisible().catch(() => false)) return 'legacy';
    return 'loading';
  });

  if (authMode === 'session') {
    await expect(page.locator('.workspace-topbar')).toBeVisible({ timeout: 5000 });
    return;
  }

  if (authMode === 'login') {
    const account = TEST_ACCOUNTS[role];
    if (!account) {
      throw new Error(`No seeded login account is configured for role "${role}". Use a real seeded account or a public-route workflow.`);
    }
    await signInWithCredentials(page, account);
  } else {
    // Legacy role-selector fallback (no DB)
    await expect.poll(async () => page.locator('#roleSelect option').count()).toBeGreaterThan(0);
    await page.selectOption('#roleSelect', role);
    await page.click('#continueButton');
    await expect(page.locator('#authGate')).toBeHidden();
  }

  await expect(page.locator('.workspace-topbar')).toBeVisible({ timeout: 5000 });
}

export async function signOut(page) {
  await page.evaluate(async () => {
    const csrfToken = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('csrf_token='))
      ?.slice('csrf_token='.length) || '';
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'x-csrf-token': csrfToken,
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('#loginEmail')).toBeVisible({ timeout: 10000 });
}

export async function openPrimaryNav(page, navKey) {
  // Open the nav drawer if the item is not yet in the viewport (collapsed sidebar).
  const target = page.locator(`[data-nav-key="${navKey}"]`);
  const inViewport = await target.isVisible({ timeout: 500 }).catch(() => false)
    && await target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight;
    }).catch(() => false);
  if (!inViewport) {
    const toggle = page.locator('[aria-label="Toggle navigation"], [aria-label="Alternar navegacion"]').first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
    } else {
      await page.locator('header button').first().click();
    }
    await expect(target).toBeVisible();
  }
  await target.click();
}

export function futureDateTimeLocal({ days = 1, hours = 10, minutes = 0 } = {}) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function injectAxe(page) {
  await page.addScriptTag({ content: axeSource });
}

export async function ensureCounselor(page, {
  firstName = 'Journey',
  lastName = 'Counselor',
  email = `journey.${Date.now()}@example.test`,
} = {}) {
  return page.evaluate(async ({ firstName, lastName, email }) => {
    function getCookie(name) {
      const pairs = document.cookie.split(';').map((part) => part.trim());
      for (const pair of pairs) {
        if (!pair.startsWith(`${name}=`)) continue;
        return decodeURIComponent(pair.slice(name.length + 1));
      }
      return '';
    }

    const existingResponse = await fetch('/api/v1/staff', { credentials: 'include' });
    const existingBody = await existingResponse.json().catch(() => ({}));
    if (!existingResponse.ok) {
      throw new Error(existingBody?.error || 'Unable to load staff');
    }

    const existing = (existingBody.items ?? []).find((item) =>
      item.role === 'counselor'
      && item.firstName === firstName
      && item.lastName === lastName);
    if (existing) return existing;

    const csrfToken = getCookie('csrf_token');
    const createResponse = await fetch('/api/v1/staff', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        role: 'counselor',
        licenseType: 'lpc',
        supervisionStatus: 'not_required',
      }),
    });
    const createBody = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) {
      throw new Error(createBody?.error || 'Unable to create counselor fixture');
    }
    return createBody.item;
  }, { firstName, lastName, email });
}

export async function runStructuralAxe(page) {
  return page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: {
        type: 'rule',
        values: [
          'aria-allowed-attr',
          'aria-required-children',
          'aria-required-parent',
          'button-name',
          'form-field-multiple-labels',
          'label',
          'landmark-one-main',
          'page-has-heading-one',
        ],
      },
    });
  });
}

export async function readLaunchMetrics(page) {
  return page.evaluate(() => {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const appAsset = resources.find((entry) => entry.name.includes('/assets/index') || entry.name.includes('/assets/app.js'));

    return {
      domContentLoadedMs: Math.round(navigationEntry?.domContentLoadedEventEnd ?? 0),
      loadMs: Math.round(navigationEntry?.loadEventEnd ?? 0),
      bundleBytes: Math.round(appAsset?.transferSize || appAsset?.encodedBodySize || 0),
      resourceCount: resources.length,
    };
  });
}

export function prettifyRole(role) {
  return role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
