import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const OUTPUT_DIR = join(ROOT, 'test-results');
const OUTPUT_FILE = join(OUTPUT_DIR, 'ui-error-scan.json');

const BASE_URL = process.env.UI_SCAN_BASE_URL || 'http://127.0.0.1:3002';

const ACCOUNTS = {
  practice_admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@churchcorecare.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'ChangeMe!Dev2024#',
  },
  client: {
    email: process.env.TEST_CLIENT_EMAIL || 'sarah.kim@example.test',
    password: process.env.TEST_CLIENT_PASSWORD || 'ChangeMe!Client2026#',
  },
};

mkdirSync(OUTPUT_DIR, { recursive: true });

function trim(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function collectPageState(page) {
  return page.evaluate(() => ({
    url: location.href,
    title: document.title,
    topbar: document.querySelector('.workspace-topbar-title')?.textContent?.trim() || null,
    nav: Array.from(document.querySelectorAll('[data-nav-key]')).map((el) => ({
      key: el.getAttribute('data-nav-key'),
      text: el.textContent?.trim() || '',
      href: el.getAttribute('href') || null,
    })),
    tabs: Array.from(document.querySelectorAll('[role="tab"]')).map((el) => ({
      text: el.textContent?.trim() || '',
      selected: el.getAttribute('aria-selected') === 'true',
    })),
    alerts: Array.from(document.querySelectorAll('[role="alert"]')).map((el) => el.textContent?.trim()).filter(Boolean),
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 6).map((el) => el.textContent?.trim()).filter(Boolean),
  }));
}

async function signIn(page, account) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  if (await page.locator('#userBadge').isVisible().catch(() => false)) return;

  await page.waitForSelector('#loginEmail', { timeout: 10_000 });
  await page.fill('#loginEmail', account.email);
  await page.fill('#loginPassword', account.password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('#authGate', { state: 'hidden', timeout: 15_000 });
  await page.waitForSelector('.workspace-topbar', { timeout: 10_000 });
}

async function signOut(page) {
  await page.evaluate(async () => {
    const csrfToken = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('csrf_token='))
      ?.slice('csrf_token='.length) || '';

    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-csrf-token': csrfToken },
    }).catch(() => {});
  });
}

async function openNav(page, key) {
  const target = page.locator(`[data-nav-key="${key}"]`).first();
  await target.evaluate((element) => {
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    element.click();
  });
  await page.waitForTimeout(1_400);
}

async function exerciseTabs(page, states, prefix) {
  const tabNames = (await page.locator('[role="tab"]').allTextContents().catch(() => []))
    .map(trim)
    .filter(Boolean);
  const visited = new Set();

  for (const name of tabNames) {
    if (visited.has(name)) continue;
    visited.add(name);

    const tab = page.getByRole('tab', { name: new RegExp(`^${escapeRegex(name)}$`, 'i') }).first();
    if (!await tab.isVisible().catch(() => false)) continue;

    await tab.click().catch(() => {});
    await page.waitForTimeout(900);
    states.push({
      kind: 'tab',
      target: `${prefix} :: ${name}`,
      state: await collectPageState(page),
    });
  }
}

function attachErrorListeners(page, errors) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ source: 'console', url: page.url(), text: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    errors.push({ source: 'pageerror', url: page.url(), text: String(err?.stack || err?.message || err) });
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      errors.push({ source: 'network', url: res.url(), text: `HTTP ${res.status()}` });
    }
  });
}

async function runPublic() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const states = [];
  const errors = [];

  attachErrorListeners(page, errors);

  try {
    for (const path of ['/', '/portal', '/about.html', '/monitor.html', '/operations.html']) {
      console.log(`[public] ${path}`);
      try {
        await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.waitForTimeout(1_200);
        states.push({
          kind: 'public',
          target: path,
          state: await collectPageState(page),
        });
      } catch (error) {
        errors.push({ source: 'navigation', url: `${BASE_URL}${path}`, text: error.message });
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return { states, errors };
}

async function runPersona(label, account) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const states = [];
  const errors = [];

  attachErrorListeners(page, errors);

  try {
    console.log(`[${label}] sign in`);
    await signIn(page, account);
    states.push({ kind: 'root', target: label, state: await collectPageState(page) });

    const navItems = await page.evaluate(() => Array.from(document.querySelectorAll('[data-nav-key]')).map((el) => ({
      key: el.getAttribute('data-nav-key'),
      text: el.textContent?.trim() || '',
      href: el.getAttribute('href') || null,
    })));

    const internalNavItems = navItems.filter((item) => !item.href);
    const externalNavItems = navItems.filter((item) => item.href);

    for (const item of internalNavItems) {
      console.log(`[${label}] nav ${item.key}`);
      try {
        await openNav(page, item.key);
        states.push({
          kind: 'nav',
          target: `${item.key} (${item.text})`,
          state: await collectPageState(page),
        });
        await exerciseTabs(page, states, item.key);
      } catch (error) {
        errors.push({ source: 'navigation', url: page.url(), text: `${item.key}: ${error.message}` });
      }
    }

    for (const item of externalNavItems) {
      console.log(`[${label}] external ${item.key}`);
      try {
        await page.goto(new URL(item.href, BASE_URL).toString(), { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.waitForTimeout(1_200);
        states.push({
          kind: 'nav',
          target: `${item.key} (${item.text})`,
          state: await collectPageState(page),
        });
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.waitForTimeout(1_200);
      } catch (error) {
        errors.push({ source: 'navigation', url: page.url(), text: `${item.key}: ${error.message}` });
      }
    }
  } finally {
    await signOut(page).catch(() => {});
    await context.close();
    await browser.close();
  }

  return { label, states, errors };
}

async function main() {
  const result = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    public: await runPublic(),
    admin: await runPersona('practice_admin', ACCOUNTS.practice_admin),
    client: await runPersona('client', ACCOUNTS.client),
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`wrote ${OUTPUT_FILE}`);
  console.log(JSON.stringify({
    publicErrors: result.public.errors.length,
    adminErrors: result.admin.errors.length,
    clientErrors: result.client.errors.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
