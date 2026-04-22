/**
 * UI Baseline Script — Baseline Mode
 * Traverses the FaithCounseling application systematically and captures:
 *   test-results/ui-map.json
 *   test-results/screen-baseline.json
 *   test-results/screenshots/
 *   test-results/baseline-summary.md
 *
 * Run: node tests/e2e/ui-baseline.mjs
 * Requires servers on :3001 (API) and :3002 (web).
 */

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const BASE_URL = 'http://127.0.0.1:3002';
const OUTPUT_DIR = join(ROOT, 'test-results');
const SCREENSHOTS_DIR = join(OUTPUT_DIR, 'screenshots');

mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {Array<object>} */
const allScreens = [];
const navEdges = [];
const visitedIds = new Set();
const globalConsoleErrors = [];
const globalNetworkFailures = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function makeId(persona, route, label) {
  return `${slugify(persona)}__${slugify(route)}__${slugify(label)}`;
}

async function safeScreenshot(page, screenId) {
  const file = join(SCREENSHOTS_DIR, `${screenId}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 8000 });
    return `screenshots/${screenId}.png`;
  } catch {
    return null;
  }
}

async function getPageMeta(page) {
  return page.evaluate(() => {
    // Primary actions
    const buttons = Array.from(document.querySelectorAll('button:not([disabled])'))
      .slice(0, 15)
      .map((b) => ({
        type: 'button',
        label: (b.textContent?.trim() || b.getAttribute('aria-label') || '').substring(0, 80),
        testId: b.getAttribute('data-testid') || null,
      }))
      .filter((b) => b.label && b.label.length > 0 && b.label !== 'undefined');

    // Tabs
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
      .map((t) => ({
        label: t.textContent?.trim() || '',
        selected: t.getAttribute('aria-selected') === 'true',
      }))
      .filter((t) => t.label);

    // Forms
    const forms = Array.from(document.querySelectorAll('form, [role="form"]'))
      .map((f) => ({
        id: f.id || null,
        role: 'form',
        fields: Array.from(f.querySelectorAll('input, select, textarea'))
          .slice(0, 10)
          .map((el) => ({ type: el.type || el.tagName.toLowerCase(), name: el.name || el.id || null, label: el.getAttribute('aria-label') || null })),
      }));

    // Tables
    const tables = Array.from(document.querySelectorAll('table, [role="grid"], [role="table"]'))
      .map((t) => ({ role: t.getAttribute('role') || 'table', rowCount: t.querySelectorAll('tr, [role="row"]').length }));

    // Visible errors / alerts
    const visibleErrors = Array.from(document.querySelectorAll('[role="alert"]'))
      .map((a) => a.textContent?.trim())
      .filter(Boolean);

    // Headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 5)
      .map((h) => ({ level: h.tagName, text: h.textContent?.trim().substring(0, 100) }))
      .filter((h) => h.text);

    return { buttons, tabs, forms, tables, visibleErrors, headings };
  }).catch(() => ({ buttons: [], tabs: [], forms: [], tables: [], visibleErrors: [], headings: [] }));
}

/**
 * Record a screen into allScreens. Deduplicates by screenId.
 */
async function capture(page, {
  screenId,
  screenName,
  route,
  uiStateType = 'page',
  navigationPath = [],
  persona,
  parentId = null,
}) {
  if (visitedIds.has(screenId)) return screenId;
  visitedIds.add(screenId);

  console.log(`  [${persona}] Capturing: ${screenName}`);

  const screenshot = await safeScreenshot(page, screenId);
  const meta = await getPageMeta(page);
  const url = page.url();

  allScreens.push({
    screen_id: screenId,
    screen_name: screenName,
    route,
    url,
    ui_state_type: uiStateType,
    navigation_path: navigationPath,
    persona,
    primary_actions: meta.buttons,
    tabs: meta.tabs,
    forms: meta.forms,
    tables: meta.tables,
    headings: meta.headings,
    visible_errors: meta.visibleErrors,
    screenshot,
    captured_at: new Date().toISOString(),
  });

  if (parentId) {
    navEdges.push({ from: parentId, to: screenId, label: screenName });
  }

  return screenId;
}

async function waitStable(page, ms = 1200) {
  await page.waitForTimeout(ms);
}

/** Wait for at least one [role="tab"] to appear, then pause briefly. */
async function waitForTabs(page, timeout = 6000) {
  try {
    await page.waitForSelector('[role="tab"]', { timeout });
    await page.waitForTimeout(400);
    return true;
  } catch {
    return false;
  }
}

/** Wait for list items to appear in page (Paper cards or table rows). */
async function waitForListItems(page, timeout = 8000) {
  try {
    await page.waitForSelector(
      '.mantine-Paper-root button, table tbody tr, [role="row"]',
      { timeout },
    );
    await page.waitForTimeout(600);
    return true;
  } catch {
    return false;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

const ACCOUNTS = {
  practice_admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@faithcounseling.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'ChangeMe!Dev2024#',
  },
  client: {
    email: process.env.TEST_CLIENT_EMAIL || 'sarah.kim@example.test',
    password: process.env.TEST_CLIENT_PASSWORD || 'ChangeMe!Client2026#',
  },
  counselor: null, // only via legacy role-selector fallback
};

async function signIn(page, persona) {
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Determine auth mode
  let mode = null;
  try {
    await Promise.race([
      page.waitForSelector('#loginEmail', { timeout: 10000 }).then(() => { mode = mode || 'login'; }),
      page.waitForSelector('#roleSelect', { timeout: 10000 }).then(() => { mode = mode || 'legacy'; }),
      page.waitForSelector('#userBadge', { timeout: 10000 }).then(() => { mode = mode || 'session'; }),
    ]);
    if (!mode) mode = 'login';
  } catch {
    // Already visible from a prior race winner
  }

  if (mode === 'session') {
    return true;
  }

  if (mode === 'login') {
    const account = ACCOUNTS[persona];
    if (!account) {
      console.log(`  No credentials for persona "${persona}", skipping.`);
      return false;
    }
    await page.fill('#loginEmail', account.email);
    await page.fill('#loginPassword', account.password);
    await page.click('button[type="submit"]');
    try {
      await page.waitForSelector('#authGate', { state: 'hidden', timeout: 15000 });
      return true;
    } catch {
      console.log(`  Login failed for ${persona}`);
      return false;
    }
  }

  if (mode === 'legacy') {
    const legacy = { practice_admin: 'practice_admin', counselor: 'counselor', client: 'client' };
    await page.selectOption('#roleSelect', legacy[persona] || persona);
    await page.click('#continueButton');
    try {
      await page.waitForSelector('#authGate', { state: 'hidden', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

async function signOut(page) {
  await page.evaluate(async () => {
    const csrfToken = document.cookie
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('csrf_token='))
      ?.slice('csrf_token='.length) || '';
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken },
      });
    } catch {}
  });
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 10000 });
}

// ─── Navigation ───────────────────────────────────────────────────────────────

async function clickNavItem(page, navKey) {
  const item = page.locator(`[data-nav-key="${navKey}"]`);

  // Check if the nav item is actually within the viewport bounds.
  // The sidebar may be a slide-in drawer: nav items exist in the DOM but are
  // outside the viewport when the drawer is closed.
  const inViewport = await item.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight;
  }).catch(() => false);

  if (!inViewport) {
    // Open the sidebar drawer
    const toggle = page.locator('[aria-label="Toggle navigation"], [aria-label="Alternar navegacion"]').first();
    if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(500);
    } else {
      const headerBtn = page.locator('header button').first();
      if (await headerBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await headerBtn.click();
        await page.waitForTimeout(500);
      }
    }
  }

  await item.scrollIntoViewIfNeeded().catch(() => {});
  await item.click({ force: true });
  await waitStable(page, 1200);
}

async function clickTabByLabel(page, ...labels) {
  for (const label of labels) {
    try {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tab = page.getByRole('tab', { name: new RegExp(`^${escaped}$`, 'i') });
      if (await tab.isVisible({ timeout: 2500 })) {
        await tab.click();
        await waitStable(page, 900);
        return label;
      }
    } catch {}
  }
  return null;
}

// ─── Public pages ─────────────────────────────────────────────────────────────

async function traversePublicPages(browser) {
  console.log('\n=== PUBLIC PAGES ===');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const publicPages = [
    { url: '/portal', id: 'public__portal__client_portal_form', name: 'Public Client Portal', route: '/portal' },
    { url: '/monitor.html', id: 'public__monitor__monitoring_page', name: 'Monitoring Page', route: '/monitor.html' },
    { url: '/about.html', id: 'public__about__about_page', name: 'About Page', route: '/about.html' },
    { url: '/operations.html', id: 'public__operations__operations_page', name: 'Operations Page', route: '/operations.html' },
  ];

  for (const pg of publicPages) {
    try {
      await page.goto(BASE_URL + pg.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await waitStable(page, 1000);
      await capture(page, {
        screenId: pg.id,
        screenName: pg.name,
        route: pg.route,
        uiStateType: 'page',
        navigationPath: [pg.name],
        persona: 'public',
      });
    } catch (e) {
      console.log(`  Error on ${pg.url}: ${e.message}`);
    }
  }

  await context.close();
}

// ─── Practice Admin traversal ─────────────────────────────────────────────────

async function traversePracticeAdmin(browser) {
  console.log('\n=== PRACTICE ADMIN TRAVERSAL ===');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const P = 'practice_admin';

  page.on('console', (msg) => {
    if (msg.type() === 'error') globalConsoleErrors.push({ persona: P, text: msg.text(), url: page.url() });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) globalNetworkFailures.push({ persona: P, status: res.status(), url: res.url() });
  });

  const ok = await signIn(page, P);
  if (!ok) { await context.close(); return; }

  await page.waitForSelector('.workspace-topbar', { timeout: 12000 });
  console.log('  Authenticated');

  // Dashboard (root)
  const ROOT = makeId(P, 'dashboard', 'operations_dashboard');
  await capture(page, { screenId: ROOT, screenName: 'Operations Dashboard', route: '/', uiStateType: 'page', navigationPath: ['Dashboard'], persona: P });

  // Users
  await clickNavItem(page, 'users');
  const USERS = makeId(P, 'users', 'user_workspace');
  await capture(page, { screenId: USERS, screenName: 'User Workspace', route: '/users', uiStateType: 'page', navigationPath: ['Users'], persona: P, parentId: ROOT });

  // Counselors
  await clickNavItem(page, 'counselors');
  const COUNSELORS = makeId(P, 'counselors', 'counselor_workspace');
  await capture(page, { screenId: COUNSELORS, screenName: 'Counselor Workspace', route: '/counselors', uiStateType: 'page', navigationPath: ['Counselors'], persona: P, parentId: ROOT });

  // Try counselor detail – the list uses a "View Profile" button (not Edit)
  await waitForListItems(page, 8000);
  const viewProfileBtn = page.getByRole('button', { name: /View Profile|Ver perfil/i }).first();
  if (await viewProfileBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await viewProfileBtn.click();
    await waitStable(page, 1800);
    const CDETAIL = makeId(P, 'counselors/detail', 'counselor_detail');
    await capture(page, { screenId: CDETAIL, screenName: 'Counselor Detail', route: '/counselors/detail', uiStateType: 'page', navigationPath: ['Counselors', 'Counselor Detail'], persona: P, parentId: COUNSELORS });

    const hasTabs = await waitForTabs(page, 5000);
    if (hasTabs) {
      for (const tab of ['Profile', 'Employment', 'Licenses', 'Certifications', 'Specialties', 'Availability', 'Faith Profile']) {
        const hit = await clickTabByLabel(page, tab);
        if (hit) {
          await capture(page, {
            screenId: makeId(P, 'counselors/detail', `tab_${tab}`),
            screenName: `Counselor Detail – ${tab}`,
            route: '/counselors/detail',
            uiStateType: 'tab',
            navigationPath: ['Counselors', 'Counselor Detail', tab],
            persona: P,
            parentId: CDETAIL,
          });
        }
      }
    }

    // Back to counselors
    const backBtn = page.getByRole('button', { name: /Counselors|Consejeros/i }).first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await waitStable(page, 800);
    }
  } else {
    console.log('  No counselors found in list – skipping detail traversal');
  }

  // Clients workspace
  await clickNavItem(page, 'clients');
  const CLIENTS = makeId(P, 'clients', 'client_workspace');
  await capture(page, { screenId: CLIENTS, screenName: 'Client Workspace', route: '/clients', uiStateType: 'page', navigationPath: ['Clients'], persona: P, parentId: ROOT });

  // New Client modal
  const newClientBtn = page.getByRole('button', { name: /New Client|Nuevo cliente/i });
  if (await newClientBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await newClientBtn.click();
    await waitStable(page, 800);
    const NCM = makeId(P, 'clients', 'new_client_modal');
    await capture(page, { screenId: NCM, screenName: 'New Client Modal', route: '/clients', uiStateType: 'modal', navigationPath: ['Clients', 'New Client'], persona: P, parentId: CLIENTS });
    await page.keyboard.press('Escape');
    await waitStable(page, 500);
  }

  // Client detail – wait for client cards to load, then click first Edit
  await waitForListItems(page, 8000);
  const clientEditBtn = page.getByRole('button', { name: /^Edit$|^Editar$/i }).first();
  if (await clientEditBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await clientEditBtn.click();
    await waitStable(page, 2000);
    const CLIDET = makeId(P, 'clients/detail', 'client_detail');
    await capture(page, { screenId: CLIDET, screenName: 'Client Detail', route: '/clients/detail', uiStateType: 'page', navigationPath: ['Clients', 'Client Detail'], persona: P, parentId: CLIENTS });

    const hasTabs = await waitForTabs(page, 5000);
    if (hasTabs) {
      for (const tab of ['Demographics', 'Insurance', 'Contacts', 'Clinical', 'Diagnoses', 'Faith Profile', 'Legal']) {
        const hit = await clickTabByLabel(page, tab);
        if (hit) {
          const tabId = makeId(P, 'clients/detail', `tab_${hit}`);
          if (!visitedIds.has(tabId)) {
            await capture(page, {
              screenId: tabId,
              screenName: `Client Detail – ${hit}`,
              route: '/clients/detail',
              uiStateType: 'tab',
              navigationPath: ['Clients', 'Client Detail', hit],
              persona: P,
              parentId: CLIDET,
            });
          }
        }
      }
    }

    const backBtn = page.getByRole('button', { name: /Clients|Clientes/i }).first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await waitStable(page, 800);
    }
  } else {
    console.log('  No clients found in list or Edit button not visible – skipping client detail traversal');
  }

  // Scheduling
  await clickNavItem(page, 'scheduling');
  const SCHED = makeId(P, 'scheduling', 'scheduling_workspace');
  await waitForTabs(page, 8000); // wait for scheduling tabs to render
  await capture(page, { screenId: SCHED, screenName: 'Scheduling Workspace', route: '/scheduling', uiStateType: 'page', navigationPath: ['Scheduling'], persona: P, parentId: ROOT });

  for (const tab of ['Appointments', 'Waitlist', 'Reminders', 'Availability', 'Recurring', 'Utilization']) {
    const hit = await clickTabByLabel(page, tab);
    if (hit) {
      await capture(page, {
        screenId: makeId(P, 'scheduling', `tab_${tab}`),
        screenName: `Scheduling – ${tab}`,
        route: '/scheduling',
        uiStateType: 'tab',
        navigationPath: ['Scheduling', tab],
        persona: P,
        parentId: SCHED,
      });
    } else {
      console.log(`  Scheduling tab not found: ${tab}`);
    }
  }

  // Clinical
  await clickNavItem(page, 'clinical');
  await capture(page, { screenId: makeId(P, 'clinical', 'clinical_workspace'), screenName: 'Clinical Workspace', route: '/clinical', uiStateType: 'page', navigationPath: ['Clinical'], persona: P, parentId: ROOT });

  // Documents
  await clickNavItem(page, 'documents');
  const DOCS = makeId(P, 'documents', 'documents_workspace');
  await capture(page, { screenId: DOCS, screenName: 'Documents Workspace', route: '/documents', uiStateType: 'page', navigationPath: ['Documents'], persona: P, parentId: ROOT });

  // Billing
  await clickNavItem(page, 'billing');
  await capture(page, { screenId: makeId(P, 'billing', 'billing_workspace'), screenName: 'Billing Workspace', route: '/billing', uiStateType: 'page', navigationPath: ['Billing'], persona: P, parentId: ROOT });

  // Portal
  await clickNavItem(page, 'portal');
  await capture(page, { screenId: makeId(P, 'portal', 'client_portal_admin'), screenName: 'Client Portal (Admin)', route: '/portal', uiStateType: 'page', navigationPath: ['Portal'], persona: P, parentId: ROOT });

  // Workspace Studio
  await clickNavItem(page, 'workspace-studio');
  const STUDIO = makeId(P, 'workspace_studio', 'studio_main');
  await waitForTabs(page, 8000); // wait for studio tabs to render
  await capture(page, { screenId: STUDIO, screenName: 'Workspace Studio', route: '/workspace-studio', uiStateType: 'page', navigationPath: ['Workspace Studio'], persona: P, parentId: ROOT });

  for (const tab of ['Practice', 'Locations', 'Staff', 'Lifecycle', 'Chart', 'Documents & Inventories', 'Clients', 'Appointments', 'Billing', 'Portal']) {
    const hit = await clickTabByLabel(page, tab);
    if (hit) {
      await capture(page, {
        screenId: makeId(P, 'workspace_studio', `tab_${tab}`),
        screenName: `Workspace Studio – ${tab}`,
        route: '/workspace-studio',
        uiStateType: 'tab',
        navigationPath: ['Workspace Studio', tab],
        persona: P,
        parentId: STUDIO,
      });
    } else {
      console.log(`  Studio tab not found: ${tab}`);
    }
  }

  // Faith
  await clickNavItem(page, 'faith');
  await capture(page, { screenId: makeId(P, 'faith', 'faith_workflows'), screenName: 'Faith Workflows', route: '/faith', uiStateType: 'page', navigationPath: ['Faith'], persona: P, parentId: ROOT });

  await signOut(page);
  await context.close();
}

// ─── Counselor traversal ──────────────────────────────────────────────────────

async function traverseCounselor(browser) {
  console.log('\n=== COUNSELOR TRAVERSAL ===');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const P = 'counselor';

  page.on('console', (msg) => {
    if (msg.type() === 'error') globalConsoleErrors.push({ persona: P, text: msg.text(), url: page.url() });
  });

  const ok = await signIn(page, P);
  if (!ok) {
    console.log('  Cannot authenticate as counselor – skipping.');
    await context.close();
    return;
  }

  await page.waitForSelector('.workspace-topbar', { timeout: 12000 }).catch(() => {});
  console.log('  Authenticated as counselor');

  const ROOT = makeId(P, 'dashboard', 'counselor_dashboard');
  await capture(page, { screenId: ROOT, screenName: 'Counselor Dashboard', route: '/', uiStateType: 'page', navigationPath: ['Dashboard'], persona: P });

  // Scheduling (counselor view)
  await clickNavItem(page, 'scheduling');
  const SCHED = makeId(P, 'scheduling', 'scheduling_workspace_counselor');
  await waitForTabs(page, 8000);
  await capture(page, { screenId: SCHED, screenName: 'Scheduling (Counselor)', route: '/scheduling', uiStateType: 'page', navigationPath: ['Scheduling'], persona: P, parentId: ROOT });

  for (const tab of ['Appointments', 'Waitlist', 'Reminders', 'Availability', 'Recurring']) {
    const hit = await clickTabByLabel(page, tab);
    if (hit) {
      await capture(page, {
        screenId: makeId(P, 'scheduling_counselor', `tab_${tab}`),
        screenName: `Scheduling (Counselor) – ${tab}`,
        route: '/scheduling',
        uiStateType: 'tab',
        navigationPath: ['Scheduling', tab],
        persona: P,
        parentId: SCHED,
      });
    }
  }

  // Clients (counselor view)
  const clientNavItem = page.locator('[data-nav-key="clients"]');
  if (await clientNavItem.isVisible({ timeout: 1500 }).catch(() => false)) {
    await clickNavItem(page, 'clients');
    await capture(page, { screenId: makeId(P, 'clients', 'client_workspace_counselor'), screenName: 'Client Workspace (Counselor)', route: '/clients', uiStateType: 'page', navigationPath: ['Clients'], persona: P, parentId: ROOT });
  }

  // Documents
  const docsNavItem = page.locator('[data-nav-key="documents"]');
  if (await docsNavItem.isVisible({ timeout: 1500 }).catch(() => false)) {
    await clickNavItem(page, 'documents');
    await capture(page, { screenId: makeId(P, 'documents', 'documents_workspace_counselor'), screenName: 'Documents (Counselor)', route: '/documents', uiStateType: 'page', navigationPath: ['Documents'], persona: P, parentId: ROOT });
  }

  await signOut(page).catch(() => {});
  await context.close();
}

// ─── Client traversal ─────────────────────────────────────────────────────────

async function traverseClient(browser) {
  console.log('\n=== CLIENT TRAVERSAL ===');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const P = 'client';

  page.on('console', (msg) => {
    if (msg.type() === 'error') globalConsoleErrors.push({ persona: P, text: msg.text(), url: page.url() });
  });

  const ok = await signIn(page, P);
  if (!ok) {
    console.log('  Cannot authenticate as client – skipping.');
    await context.close();
    return;
  }

  await page.waitForSelector('.workspace-topbar', { timeout: 12000 }).catch(() => {});
  console.log('  Authenticated as client');

  const ROOT = makeId(P, 'portal', 'client_portal_home');
  await capture(page, { screenId: ROOT, screenName: 'Client Portal Home', route: '/', uiStateType: 'page', navigationPath: ['Portal'], persona: P });

  // Portal nav item
  await clickNavItem(page, 'portal');
  const PORTAL = makeId(P, 'portal', 'client_portal_view');
  await capture(page, { screenId: PORTAL, screenName: 'Client Portal (Client View)', route: '/portal', uiStateType: 'page', navigationPath: ['Portal'], persona: P, parentId: ROOT });

  await signOut(page).catch(() => {});
  await context.close();
}

// ─── Output generation ────────────────────────────────────────────────────────

function buildUIMap() {
  const nodes = allScreens.map((s) => ({
    id: s.screen_id,
    label: s.screen_name,
    route: s.route,
    persona: s.persona,
    ui_state_type: s.ui_state_type,
  }));

  return {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    mode: 'baseline',
    total_screens: allScreens.length,
    personas_covered: [...new Set(allScreens.map((s) => s.persona))],
    screens: nodes,
    navigation_graph: {
      nodes,
      edges: navEdges,
    },
  };
}

function buildSummaryMarkdown(uiMap) {
  const byPersona = {};
  for (const s of allScreens) {
    if (!byPersona[s.persona]) byPersona[s.persona] = [];
    byPersona[s.persona].push(s);
  }

  const errorCount = allScreens.reduce((n, s) => n + (s.visible_errors?.length || 0), 0);
  const consoleErrCount = globalConsoleErrors.length;
  const netFailCount = globalNetworkFailures.length;

  let md = `# UI Baseline Summary\n\n`;
  md += `**Generated:** ${uiMap.generated_at}\n`;
  md += `**Mode:** baseline\n`;
  md += `**Base URL:** ${BASE_URL}\n`;
  md += `**Total screens captured:** ${allScreens.length}\n`;
  md += `**Visible UI errors:** ${errorCount}\n`;
  md += `**Console errors:** ${consoleErrCount}\n`;
  md += `**Network failures:** ${netFailCount}\n\n`;

  md += `## Overall Decision\n\n`;
  if (allScreens.length === 0) {
    md += `> **FAIL** — No screens captured. Application may not be reachable.\n\n`;
  } else {
    md += `> **PASS** — Initial baseline established with ${allScreens.length} screens.\n\n`;
  }

  md += `## Screens by Persona\n\n`;
  for (const [persona, screens] of Object.entries(byPersona)) {
    md += `### ${persona} (${screens.length} screens)\n\n`;
    md += `| Screen | Type | Navigation Path |\n`;
    md += `|--------|------|-----------------|\n`;
    for (const s of screens) {
      md += `| ${s.screen_name} | ${s.ui_state_type} | ${s.navigation_path.join(' → ')} |\n`;
    }
    md += '\n';
  }

  if (globalConsoleErrors.length > 0) {
    md += `## Console Errors\n\n`;
    for (const err of globalConsoleErrors.slice(0, 20)) {
      md += `- **[${err.persona}]** \`${err.url}\`: ${err.text.substring(0, 120)}\n`;
    }
    md += '\n';
  }

  if (netFailCount > 0) {
    md += `## Network Failures\n\n`;
    for (const f of globalNetworkFailures.slice(0, 20)) {
      md += `- **[${f.persona}]** HTTP ${f.status}: ${f.url}\n`;
    }
    md += '\n';
  }

  md += `## Screenshots\n\nAll screenshots saved to \`test-results/screenshots/\`.\n`;

  return md;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('FaithCounseling UI Baseline – Starting');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output:   ${OUTPUT_DIR}`);

  const browser = await chromium.launch({ headless: true });

  try {
    // Public pages
    await traversePublicPages(browser);

    // Authenticated personas
    await traversePracticeAdmin(browser);
    await traverseCounselor(browser);
    await traverseClient(browser);
  } finally {
    await browser.close();
  }

  console.log('\n=== WRITING OUTPUTS ===');

  const uiMap = buildUIMap();
  writeFileSync(join(OUTPUT_DIR, 'ui-map.json'), JSON.stringify(uiMap, null, 2));
  console.log(`  ui-map.json (${uiMap.total_screens} screens)`);

  writeFileSync(join(OUTPUT_DIR, 'screen-baseline.json'), JSON.stringify(allScreens, null, 2));
  console.log(`  screen-baseline.json`);

  const summary = buildSummaryMarkdown(uiMap);
  writeFileSync(join(OUTPUT_DIR, 'baseline-summary.md'), summary);
  console.log(`  baseline-summary.md`);

  console.log('\n=== COMPLETE ===');
  console.log(`Total screens: ${allScreens.length}`);
  console.log(`Console errors: ${globalConsoleErrors.length}`);
  console.log(`Network failures: ${globalNetworkFailures.length}`);
}

main().catch((err) => {
  console.error('Baseline failed:', err);
  process.exit(1);
});
