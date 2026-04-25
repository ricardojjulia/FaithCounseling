import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await page.goto('http://127.0.0.1:3002/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#loginEmail', { timeout: 10000 });
await page.fill('#loginEmail', 'admin@churchcorecare.local');
await page.fill('#loginPassword', 'ChangeMe!Dev2024#');
await page.click('button[type="submit"]');
await page.waitForSelector('#authGate', { state: 'hidden', timeout: 15000 });
await page.waitForSelector('.workspace-topbar', { timeout: 10000 });

async function dumpTabs(label) {
  return page.evaluate((l) => {
    const els = Array.from(document.querySelectorAll('[role="tab"]'));
    return { label: l, count: els.length, tabs: els.map((t) => t.textContent?.trim()) };
  }, label);
}

// Scheduling
const schedNav = page.locator('[data-nav-key="scheduling"]');
await schedNav.scrollIntoViewIfNeeded().catch(() => {});
await schedNav.click({ force: true });
await page.waitForTimeout(5000);
console.log('SCHEDULING:', JSON.stringify(await dumpTabs('scheduling')));
const h1 = await page.evaluate(() => document.querySelector('.workspace-topbar-title')?.textContent?.trim());
console.log('Topbar heading after scheduling click:', h1);

// Workspace Studio
const studioNav = page.locator('[data-nav-key="workspace-studio"]');
await studioNav.scrollIntoViewIfNeeded().catch(() => {});
await studioNav.click({ force: true });
await page.waitForTimeout(5000);
console.log('STUDIO:', JSON.stringify(await dumpTabs('studio')));

// Counselors
const counselorNav = page.locator('[data-nav-key="counselors"]');
await counselorNav.scrollIntoViewIfNeeded().catch(() => {});
await counselorNav.click({ force: true });
await page.waitForTimeout(5000);
const cbts = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim()).filter(Boolean));
console.log('COUNSELOR BUTTONS:', JSON.stringify(cbts.slice(0, 25)));

// Clients
const clientNav = page.locator('[data-nav-key="clients"]');
await clientNav.scrollIntoViewIfNeeded().catch(() => {});
await clientNav.click({ force: true });
await page.waitForTimeout(5000);
const clibs = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim()).filter(Boolean));
console.log('CLIENT BUTTONS:', JSON.stringify(clibs.slice(0, 25)));

await browser.close();


await page.goto('http://127.0.0.1:3002/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#loginEmail', { timeout: 10000 });
await page.fill('#loginEmail', 'admin@churchcorecare.local');
await page.fill('#loginPassword', 'ChangeMe!Dev2024#');
await page.click('button[type="submit"]');
await page.waitForSelector('#authGate', { state: 'hidden', timeout: 15000 });
await page.waitForSelector('.workspace-topbar', { timeout: 10000 });

// Click scheduling nav
const schedNav = page.locator('[data-nav-key="scheduling"]');
await schedNav.scrollIntoViewIfNeeded().catch(() => {});
await schedNav.click({ force: true });
await page.waitForTimeout(4000);

console.log('URL after scheduling click:', page.url());

const tabs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[role="tab"]')).map(t => ({
    text: t.textContent?.trim(),
    ariaLabel: t.getAttribute('aria-label'),
    ariaSelected: t.getAttribute('aria-selected'),
  }));
});
console.log('SCHEDULING TABS:', JSON.stringify(tabs, null, 2));

const heading = await page.evaluate(() => 
  document.querySelector('.workspace-topbar-title')?.textContent?.trim()
);
console.log('Heading:', heading);

// Try workspace studio
const studioNav = page.locator('[data-nav-key="workspace-studio"]');
await studioNav.scrollIntoViewIfNeeded().catch(() => {});
await studioNav.click({ force: true });
await page.waitForTimeout(4000);

const studioTabs = await page.evaluate(() => {

// Check counselors list
const counselorNav = page.locator('[data-nav-key="counselors"]');
await counselorNav.scrollIntoViewIfNeeded().catch(() => {});
await counselorNav.click({ force: true });
await page.waitForTimeout(5000);
const buttons = await page.evaluate(() => 
  Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean)
);
console.log('COUNSELOR BUTTONS:', buttons.slice(0, 30));

// Check clients list
const clientNav = page.locator('[data-nav-key="clients"]');
await clientNav.scrollIntoViewIfNeeded().catch(() => {});
await clientNav.click({ force: true });
await page.waitForTimeout(5000);
const clientButtons = await page.evaluate(() => 
  Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean)
);
console.log('CLIENT BUTTONS:', clientButtons.slice(0, 30));

await browser.close();


await page.goto('http://127.0.0.1:3002/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#loginEmail', { timeout: 10000 });
await page.fill('#loginEmail', 'admin@churchcorecare.local');
await page.fill('#loginPassword', 'ChangeMe!Dev2024#');
await page.click('button[type="submit"]');
await page.waitForSelector('#authGate', { state: 'hidden', timeout: 15000 });
await page.waitForSelector('.workspace-topbar', { timeout: 10000 });

// Click scheduling nav
await page.locator('[data-nav-key="scheduling"]').click({ force: true });
await page.waitForTimeout(4000);

const tabs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[role="tab"]')).map(t => ({
    text: t.textContent?.trim(),
    ariaLabel: t.getAttribute('aria-label'),
    ariaSelected: t.getAttribute('aria-selected'),
  }));
});
console.log('SCHEDULING TABS:', JSON.stringify(tabs, null, 2));

// Try workspace studio
await page.locator('[data-nav-key="workspace-studio"]').click({ force: true });
await page.waitForTimeout(4000);

const studioTabs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[role="tab"]')).map(t => ({
    text: t.textContent?.trim(),
    ariaLabel: t.getAttribute('aria-label'),
  }));
});
console.log('STUDIO TABS:', JSON.stringify(studioTabs, null, 2));

// Check counselors list
await page.locator('[data-nav-key="counselors"]').click({ force: true });
await page.waitForTimeout(4000);
const buttons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).slice(0, 20).map(b => b.textContent?.trim()).filter(Boolean);
});
console.log('COUNSELOR BUTTONS:', buttons);

// Check clients list
await page.locator('[data-nav-key="clients"]').click({ force: true });
await page.waitForTimeout(4000);
const clientButtons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).slice(0, 20).map(b => b.textContent?.trim()).filter(Boolean);
});
console.log('CLIENT BUTTONS:', clientButtons);

await browser.close();
