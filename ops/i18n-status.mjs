#!/usr/bin/env node
/**
 * ops/i18n-status.mjs
 *
 * Print a formatted table of i18n locale completion to stdout.
 * Requires the ChurchCore Care API to be running.
 *
 * Usage:
 *   node ops/i18n-status.mjs
 *   API_BASE_URL=http://127.0.0.1:3001 node ops/i18n-status.mjs
 */

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3001';

const headers = {
  'x-staff-role': 'practice_admin',
  'x-tenant-id':  'system',
  'x-actor-id':   'i18n-status-script',
};

async function main() {
  let status;
  try {
    const res = await fetch(`${API_BASE}/v1/i18n/status`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    status = await res.json();
  } catch (err) {
    console.error(`\n  Error: Cannot reach API at ${API_BASE}\n  ${err.message}`);
    console.error(`  Start the API with: node start-servers.js\n`);
    process.exit(1);
  }

  const { locales = [], totalKeys = 0, generatedAt } = status;

  console.log(`\n  i18n Status — ${new Date(generatedAt).toLocaleString()}`);
  console.log(`  Total message keys: ${totalKeys}\n`);

  const colWidths = { code: 10, label: 30, pct: 6, status: 10 };
  const hr = `  ${'─'.repeat(colWidths.code + colWidths.label + colWidths.pct + colWidths.status + 9)}`;

  const pad = (s, n) => String(s ?? '').padEnd(n);

  console.log(`  ${pad('Locale', colWidths.code)} ${pad('Label', colWidths.label)} ${pad('Pct', colWidths.pct)} ${pad('Status', colWidths.status)}`);
  console.log(hr);

  for (const loc of locales) {
    const statusSymbol = loc.status === 'source'   ? '●'
                       : loc.status === 'complete'  ? '✓'
                       : loc.status === 'partial'   ? '◑'
                       : '○';
    console.log(
      `  ${pad(loc.code, colWidths.code)} ${pad(loc.label, colWidths.label)} ${pad(loc.completion + '%', colWidths.pct)} ${statusSymbol} ${loc.status}`,
    );

    // Show namespace breakdown for non-complete locales
    if (loc.status !== 'source' && loc.status !== 'complete' && loc.namespaceCompletion) {
      const namespaces = Object.entries(loc.namespaceCompletion)
        .filter(([, pct]) => pct < 100)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 5);
      for (const [ns, pct] of namespaces) {
        console.log(`  ${' '.repeat(colWidths.code)}   ${pad(ns, 20)} ${pct}%`);
      }
    }
  }

  console.log(hr);
  console.log();
}

main();
