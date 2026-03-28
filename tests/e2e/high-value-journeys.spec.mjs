import { test, expect } from '@playwright/test';
import { ensureCounselor, futureDateTimeLocal, openPrimaryNav, signInAs } from './helpers.mjs';

test.describe('high-value UI journeys', () => {
  test('practice admin can create a client and schedule an appointment from the current workspace flow', async ({ page }) => {
    const suffix = String(Date.now()).slice(-6);
    const firstName = `Step${suffix}`;
    const lastName = 'Journey';
    const start = futureDateTimeLocal({ days: 1, hours: 10, minutes: 0 });
    const end = futureDateTimeLocal({ days: 1, hours: 11, minutes: 0 });
    const day = start.slice(0, 10);

    await signInAs(page, 'practice_admin');
    await ensureCounselor(page);
    await expect(page.getByText(/Today's Sessions|Sesiones de hoy/i)).toBeVisible();
    await openPrimaryNav(page, 'clients');
    await expect(page.getByRole('heading', { name: /Clients|Clientes/i })).toBeVisible();

    await page.getByRole('button', { name: /New Client|Nuevo cliente/i }).click();
    await page.getByLabel('First name').fill(firstName);
    await page.getByLabel('Last name').fill(lastName);
    await page.getByLabel('Faith background').fill('Evangelical');
    await page.getByRole('button', { name: /Create Client|Crear cliente/i }).click();

    await expect(page.locator('section[aria-labelledby="clientsPanelTitle"]')).toContainText(`${firstName} ${lastName}`);
    await page.getByRole('button', { name: /New Appointment|Nueva cita/i }).click();
    await expect(page.getByRole('dialog', { name: /New Appointment|Nueva cita/i })).toBeVisible();
    await page.getByRole('textbox', { name: 'Client' }).click();
    await page.getByRole('textbox', { name: 'Client' }).fill(firstName);
    await page.getByRole('option', { name: new RegExp(`${firstName} ${lastName}`, 'i') }).click();
    await page.getByRole('textbox', { name: 'Counselor' }).click();
    await page.getByRole('textbox', { name: 'Counselor' }).fill('Journey');
    await page.getByRole('option', { name: /Journey Counselor/i }).click();
    await page.locator('input[data-path="startsAt"]').fill(start);
    await page.locator('input[data-path="endsAt"]').fill(end);
    await page.getByLabel('Location').fill('Journey Room');
    await page.getByRole('button', { name: /Create Appointment|Crear cita/i }).click();

    await expect(page.getByText(/Appointment created|Cita creada/i)).toBeVisible();
    await page.getByLabel('Day').fill(day);
    await expect(page.getByRole('table')).toContainText(`${firstName} ${lastName}`);
  });

  test('practice admin can open workspace studio, monitoring, and operations surfaces used in daily operations', async ({ page }) => {
    await signInAs(page, 'practice_admin');
    await openPrimaryNav(page, 'workspace-studio');
    await expect(page.getByRole('heading', { name: /Workspace Studio|Estudio del Espacio/i })).toBeVisible();
    await expect(page.getByText('Client Portal Access')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Portal' })).toBeVisible();

    await page.goto('/monitor.html');
    await expect(page.getByText('Surface Monitoring')).toBeVisible();
    await expect(page.getByText(/Top Failing Surfaces/i)).toBeVisible();

    await page.goto('/operations.html');
    await expect(page.getByText('Operations Studio')).toBeVisible();
    await expect(page.locator('[data-tab="reporting"]')).toBeVisible();
    await expect(page.locator('[data-tab="platform"]')).toBeVisible();
    await expect(page.locator('[data-tab="audit"]')).toBeVisible();
  });

  test('public client can submit a portal intake request from the portal landing page', async ({ page }) => {
    const suffix = String(Date.now()).slice(-6);

    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: 'FaithCounseling Client Portal' })).toBeVisible();

    await page.locator('#firstName').fill(`Portal${suffix}`);
    await page.locator('#lastName').fill('Request');
    await page.locator('#email').fill(`portal-${suffix}@example.test`);
    await page.locator('#phone').fill('555-0100');
    await page.getByLabel('Individual').check();
    await page.getByLabel('Faith-integrated').check();
    await page.locator('#notes').fill('Browser automation portal request');
    await page.getByRole('button', { name: 'Submit Request' }).click();

    await expect(page.locator('#portalRequestStatus')).toContainText('Request submitted successfully');
  });
});
