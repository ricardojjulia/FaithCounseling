#!/usr/bin/env node
/**
 * ops/translate-locale.mjs
 *
 * Node.js CLI equivalent of the /translate-locale Claude Code skill.
 * Brings a new or existing locale from zero to live without Docker.
 *
 * Usage:
 *   node ops/translate-locale.mjs <locale> [options]
 *
 * Options:
 *   --source <locale>    Source locale (default: en-US)
 *   --scope <scope>      missing | full | <namespace> (default: missing)
 *   --review             Run integrity checks only, skip translation
 *   --help               Show usage
 *
 * Examples:
 *   node ops/translate-locale.mjs es-MX
 *   node ops/translate-locale.mjs fr-FR --scope missing
 *   node ops/translate-locale.mjs es-MX --review
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'apps/api/data/i18n');
const STATUS_DIR = path.join(ROOT, 'docs/i18n');
const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3001';

const HEADERS = {
  'Content-Type': 'application/json',
  'x-staff-role': 'practice_admin',
  'x-tenant-id':  'system',
  'x-actor-id':   'translate-locale-script',
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { locale: null, source: 'en-US', scope: 'missing', review: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') { printHelp(); process.exit(0); }
    else if (args[i] === '--review') result.review = true;
    else if (args[i] === '--source' && args[i + 1]) { result.source = args[++i]; }
    else if (args[i] === '--scope'  && args[i + 1]) { result.scope  = args[++i]; }
    else if (!args[i].startsWith('--')) result.locale = args[i];
  }

  if (!result.locale) {
    console.error('\n  Error: locale argument is required.\n');
    printHelp();
    process.exit(1);
  }
  return result;
}

function printHelp() {
  console.log(`
  Usage: node ops/translate-locale.mjs <locale> [options]

  Options:
    --source <locale>    Source locale (default: en-US)
    --scope <scope>      missing | full | <namespace> (default: missing)
    --review             Integrity checks only, no translation API call
    --help               Show this message

  Examples:
    node ops/translate-locale.mjs es-MX
    node ops/translate-locale.mjs fr-FR --scope missing
    node ops/translate-locale.mjs es-MX --review
  `);
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PATCH ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Integrity check helpers
// ---------------------------------------------------------------------------
function extractPlaceholders(str) {
  const tokens = new Set();
  for (const m of String(str ?? '').matchAll(/\{(\w+)\}/g)) tokens.add(m[1]);
  return tokens;
}

async function readLocaleFile(code) {
  try {
    const raw = await readFile(path.join(I18N_DIR, `${code}.json`), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function runIntegrityChecks(locale, source) {
  const sourceData = await readLocaleFile(source);
  const targetData = await readLocaleFile(locale);
  const issues = { placeholders: [], glossary: [], missing: [] };

  // Placeholder check
  for (const [key, sourceValue] of Object.entries(sourceData)) {
    if (key.startsWith('__')) continue;
    if (!(key in targetData)) { issues.missing.push(key); continue; }
    const sourcePH = extractPlaceholders(sourceValue);
    const targetPH = extractPlaceholders(targetData[key]);
    for (const ph of sourcePH) {
      if (!targetPH.has(ph)) {
        issues.placeholders.push({ key, expected: ph, translated: targetData[key] });
      }
    }
  }

  // Glossary check (optional — only if file exists)
  const langCode = locale.split('-')[0]; // 'es' from 'es-MX'
  const glossaryPath = path.join(ROOT, `agents/translation_guardian/data/glossaries/${langCode}.json`);
  try {
    const glossary = JSON.parse(await readFile(glossaryPath, 'utf8'));
    const required = glossary.required ?? glossary.preferred ?? {};
    for (const [en, localized] of Object.entries(required)) {
      // Find source keys containing the English term
      for (const [key, sourceValue] of Object.entries(sourceData)) {
        if (key.startsWith('__')) continue;
        if (String(sourceValue).toLowerCase().includes(en.toLowerCase())) {
          const translated = targetData[key] ?? '';
          if (translated && !translated.toLowerCase().includes(localized.toLowerCase())) {
            issues.glossary.push({ key, expected: localized, found: translated });
          }
        }
      }
    }
  } catch {
    // No glossary file — skip
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Status doc writer
// ---------------------------------------------------------------------------
async function writeStatusDoc(locale, { source, mode, totalKeys, translated, completion, status, issues, deltaTranslated }) {
  await mkdir(STATUS_DIR, { recursive: true });
  const now = new Date().toISOString();

  const placeholderList = issues.placeholders.length
    ? issues.placeholders.map((i) => `- \`${i.key}\`: missing \`{${i.expected}}\``).join('\n')
    : 'None';

  const glossaryList = issues.glossary.length
    ? issues.glossary.map((i) => `- \`${i.key}\`: expected "${i.expected}"`).join('\n')
    : 'None';

  const missingList = issues.missing.length
    ? issues.missing.slice(0, 20).map((k) => `- \`${k}\``).join('\n')
    : 'None';

  const recommendation = issues.placeholders.length > 0
    ? `Needs attention — ${issues.placeholders.length} placeholder mismatch${issues.placeholders.length !== 1 ? 'es' : ''} require manual correction before this locale is safe to use in production.`
    : completion >= 95
      ? 'Ready for review — all keys translated, no placeholder issues. Run the Translation Guardian for browser validation before promoting to `complete`.'
      : `Partial — ${totalKeys - translated} keys still missing. Re-run \`/translate-locale ${locale}\` after adding GOOGLE_TRANSLATE_API_KEY, or add translations manually.`;

  const content = `# Locale Status: ${locale}

**Last run:** ${now}
**Mode:** ${mode}
**Source locale:** ${source}

## Summary

| Metric | Value |
| ------ | ----- |
| Total keys | ${totalKeys} |
| Translated | ${translated} |
| Missing | ${totalKeys - translated} |
| Completion | ${completion}% |
| Placeholder issues | ${issues.placeholders.length} |
| Glossary violations | ${issues.glossary.length} |
| Status | ${status} |

## Recommendation

${recommendation}

## Placeholder Issues

${placeholderList}

## Glossary Violations

${glossaryList}

## Missing Keys (first 20)

${missingList}
`;

  await writeFile(path.join(STATUS_DIR, `${locale}-status.md`), content);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { locale, source, scope, review } = parseArgs(process.argv);
  console.log(`\n  translate-locale: ${locale}  [source: ${source}, scope: ${scope}, review: ${review}]\n`);

  // Step 1 — API health
  let localeList;
  try {
    const data = await apiGet('/v1/i18n/locales');
    localeList = (data.items ?? []).map((i) => i.code ?? i.locale);
    console.log(`  ✓ API reachable — ${localeList.length} locales loaded`);
  } catch (err) {
    console.error(`\n  Error: Cannot reach API at ${API_BASE}`);
    console.error(`  ${err.message}`);
    console.error(`\n  Start the API with: node start-servers.js\n`);
    process.exit(1);
  }

  if (!review) {
    // Step 2 — Create locale slot if missing
    if (!localeList.includes(locale)) {
      console.log(`  Creating locale slot for ${locale}…`);
      try {
        await apiPost('/v1/i18n/locales', { locale, label: locale });
        console.log(`  ✓ Locale slot created`);
      } catch (err) {
        console.error(`  Error creating locale: ${err.message}`);
        process.exit(1);
      }
    } else {
      console.log(`  ✓ Locale slot already exists`);
    }

    // Step 3 — Configure settings
    try {
      await apiPatch(`/v1/i18n/settings/${locale}`, {
        settings: { sourceLocale: source, tone: 'pastoral', fallbackMode: 'copy', useGlossary: true },
      });
      console.log(`  ✓ Translation settings configured`);
    } catch (err) {
      console.warn(`  Warning: Could not save settings — ${err.message}`);
    }
  }

  // Step 4 — Pre-state
  let statusData;
  try {
    statusData = await apiGet('/v1/i18n/status');
  } catch {
    statusData = { locales: [], totalKeys: 0 };
  }

  const preLocale = (statusData.locales ?? []).find((l) => l.code === locale);
  const preCompletion = preLocale?.completion ?? 0;
  const totalKeys = statusData.totalKeys ?? 0;
  const preTranslated = Math.round((preCompletion / 100) * totalKeys);

  console.log(`\n  Pre-translation state`);
  console.log(`    Total keys:  ${totalKeys}`);
  console.log(`    Translated:  ${preTranslated}`);
  console.log(`    Missing:     ${totalKeys - preTranslated}`);
  console.log(`    Completion:  ${preCompletion}%`);

  let postTranslated = preTranslated;
  let postCompletion = preCompletion;

  if (!review) {
    // Step 5 — Translate
    console.log(`\n  Running translation (scope: ${scope})…`);
    try {
      const result = await apiPost('/v1/i18n/translate', { locale, scope });
      postCompletion = result.completion ?? preCompletion;
      postTranslated = Math.round((postCompletion / 100) * totalKeys);
      const delta = postTranslated - preTranslated;
      console.log(`  ✓ Translation complete — ${delta > 0 ? `+${delta} keys` : 'no new keys'} (${postCompletion}%)`);
    } catch (err) {
      console.warn(`  Warning: Translation failed — ${err.message}`);
      if (err.message.includes('503') || err.message.includes('not configured')) {
        console.warn(`  Auto-translation not available (GOOGLE_TRANSLATE_API_KEY not set).`);
        console.warn(`  Edit apps/api/data/i18n/${locale}.json manually, then re-run with --review.`);
      }
    }
  }

  // Step 6 — Integrity checks
  console.log(`\n  Running integrity checks…`);
  const issues = await runIntegrityChecks(locale, source);
  console.log(`    Missing keys:        ${issues.missing.length}`);
  console.log(`    Placeholder issues:  ${issues.placeholders.length}`);
  console.log(`    Glossary violations: ${issues.glossary.length}`);

  if (issues.placeholders.length > 0) {
    console.log(`\n  Placeholder issues:`);
    for (const i of issues.placeholders) {
      console.log(`    ${i.key}: missing {${i.expected}}`);
    }
  }

  // Determine final status
  const finalCompletion = review ? preCompletion : postCompletion;
  const finalStatus = finalCompletion >= 95 ? 'complete'
    : finalCompletion >= 20 ? 'partial'
    : 'stub';
  const deltaTranslated = postTranslated - preTranslated;

  // Step 7 — Write status doc
  await writeStatusDoc(locale, {
    source,
    mode: review ? 'review' : 'add',
    totalKeys,
    translated: review ? preTranslated : postTranslated,
    completion: finalCompletion,
    status: finalStatus,
    issues,
    deltaTranslated,
  });
  console.log(`\n  ✓ Status doc written → docs/i18n/${locale}-status.md`);

  // Step 8 — Final summary
  console.log(`
  ┌─────────────────────────────────────────────────────┐
  │  Locale:              ${locale.padEnd(28)} │
  │  Keys translated:     ${String(review ? preTranslated : postTranslated).padEnd(7)} (this run: ${String(review ? 0 : deltaTranslated).padEnd(7)})  │
  │  Missing:             ${String(issues.missing.length).padEnd(28)} │
  │  Placeholder issues:  ${String(issues.placeholders.length).padEnd(28)} │
  │  Glossary violations: ${String(issues.glossary.length).padEnd(28)} │
  │  Status:              ${finalStatus.padEnd(28)} │
  │  Status doc:          docs/i18n/${locale}-status.md ${' '.repeat(Math.max(0, 14 - locale.length))}│
  └─────────────────────────────────────────────────────┘`);

  if (issues.placeholders.length > 0) {
    console.log(`\n  ⚠ Fix placeholder mismatches before using this locale in production.`);
    console.log(`    Edit apps/api/data/i18n/${locale}.json, then re-run with --review.\n`);
  } else if (finalStatus === 'complete') {
    console.log(`\n  ✓ Ready for Translation Guardian browser validation.`);
    console.log(`    Run: pnpm agent:translation:run\n`);
  } else if (!review) {
    console.log(`\n  ℹ Add GOOGLE_TRANSLATE_API_KEY to .env and re-run to fill missing keys.\n`);
  }
}

main().catch((err) => {
  console.error(`\n  Fatal: ${err.message}\n`);
  process.exit(1);
});
