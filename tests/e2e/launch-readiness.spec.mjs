import { test, expect } from '@playwright/test';
import { injectAxe, openPrimaryNav, readLaunchMetrics, runStructuralAxe, signInAs } from './helpers.mjs';

test.describe('launch readiness audits', () => {
  test('practice admin dashboard passes structural accessibility checks', async ({ page }) => {
    await signInAs(page, 'practice_admin');
    await injectAxe(page);

    const results = await runStructuralAxe(page);
    const violations = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(violations).toEqual([]);
  });

  test('public portal page passes structural accessibility checks', async ({ page }) => {
    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: 'ChurchCore Care Client Portal' })).toBeVisible();
    await injectAxe(page);

    const results = await runStructuralAxe(page);
    const violations = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
    expect(violations).toEqual([]);
  });

  test('practice admin dashboard stays within baseline local performance thresholds', async ({ page }) => {
    await signInAs(page, 'practice_admin');
    const metrics = await readLaunchMetrics(page);

    expect(metrics.domContentLoadedMs).toBeLessThan(4_000);
    expect(metrics.loadMs).toBeLessThan(6_000);
    expect(metrics.bundleBytes).toBeGreaterThan(0);
    // Current production build baseline after the synced asset refresh.
    expect(metrics.bundleBytes).toBeLessThan(650_000);
    expect(metrics.resourceCount).toBeGreaterThan(0);
  });
});
