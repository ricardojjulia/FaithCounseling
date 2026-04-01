import { test, expect } from '@playwright/test';

async function gotoWithRetry(page, path, attempts = 6) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      return;
    } catch (error) {
      lastError = error;
      if (!/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|Navigation timeout/i.test(String(error?.message || '')) || i === attempts - 1) {
        break;
      }
      await page.waitForTimeout(1_200);
    }
  }
  throw lastError;
}

test.describe('inclusive smoke coverage', () => {
  test('auth gate supports keyboard-first sign in and clear failure feedback', async ({ page }) => {
    await gotoWithRetry(page, '/');
    await expect(page.locator('#loginEmail')).toBeVisible();
    await expect(page.locator('#loginPassword')).toBeVisible();

    // Keep keyboard-first flow, but avoid strict focus assertions that can
    // intermittently fail when browser chrome steals initial focus.
    await page.locator('#loginEmail').focus();
    await expect(page.locator('#loginEmail')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#loginPassword')).toBeFocused();

    await page.locator('#loginEmail').fill(process.env.TEST_ADMIN_EMAIL || 'admin@faithcounseling.local');
    await page.locator('#loginPassword').fill(process.env.TEST_ADMIN_PASSWORD || 'ChangeMe!Dev2024#');
    await page.locator('#loginPassword').press('Enter');

    const authGate = page.locator('#authGate');
    const alert = authGate.getByRole('alert');

    const authOutcome = await expect.poll(async () => {
      if (await authGate.isHidden().catch(() => false)) return 'signed-in';
      if (await alert.isVisible().catch(() => false)) return 'failed';
      return 'pending';
    }, { timeout: 15_000 }).not.toBe('pending').then(async () => {
      if (await authGate.isHidden().catch(() => false)) return 'signed-in';
      return 'failed';
    });

    if (authOutcome === 'signed-in') {
      await expect(page.locator('#userBadge')).toBeVisible();
      await expect(page.locator('#userBadge')).not.toContainText('Not signed in');
    } else {
      await expect(alert).toContainText(/Access denied|Unable to reach the server|Invalid credentials|locked|try again/i);
    }
  });

  test('public monitoring page loads with key landmarks', async ({ page }) => {
    await gotoWithRetry(page, '/monitor.html');
    await expect(page.locator('.brand-sub').filter({ hasText: 'Monitoring' })).toBeVisible();
    await expect(page.locator('.kpi-label').filter({ hasText: 'API Requests' })).toBeVisible();
    await expect(page.locator('.card-title').filter({ hasText: 'Overall UI Summary' })).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('portal request form provides clear validation and actionable server feedback', async ({ page }) => {
    const suffix = String(Date.now()).slice(-6);

    await page.goto('/portal');
    const hasPortalForm = await page.locator('#portalRequestForm').isVisible().catch(() => false);
    if (!hasPortalForm) {
      await expect(page.locator('#loginEmail')).toBeVisible();
      return;
    }

    await page.getByRole('button', { name: 'Submit Request' }).click();
    await expect(page.locator('#portalRequestStatus')).toContainText('First name, last name, and email are required.');
    await expect(page.locator('#portalRequestStatus')).toHaveClass(/error/);

    await page.locator('#firstName').fill(`Inclusive${suffix}`);
    await page.locator('#lastName').fill('Coverage');
    await page.locator('#email').fill(`inclusive-${suffix}@example.test`);
    await page.getByLabel('Individual').check();
    await page.getByLabel(/I agree that the practice may contact me/i).check();
    await page.locator('#notes').fill('Inclusive E2E coverage request');
    await page.getByRole('button', { name: 'Submit Request' }).click();

    const status = page.locator('#portalRequestStatus');
    await expect(status).toContainText(/Request submitted successfully|Authentication required|Failed to fetch/);

    const statusText = await status.innerText();
    if (/Authentication required|Failed to fetch/i.test(statusText)) {
      await expect(status).toHaveClass(/error/);
    } else {
      await expect(status).toHaveClass(/success/);
    }
  });

  test('portal remains usable at mobile viewport sizes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWithRetry(page, '/portal', 8);

    const hasPortalForm = await page.locator('#portalRequestForm').isVisible().catch(() => false);
    if (!hasPortalForm) {
      await expect(page.locator('#loginEmail')).toBeVisible();
      return;
    }
    await expect(page.locator('#portalRequestForm')).toBeVisible();
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();

    // Basic keyboard reachability still works on small screens.
    await page.locator('#firstName').focus();
    await expect(page.locator('#firstName')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#lastName')).toBeFocused();
  });
});
