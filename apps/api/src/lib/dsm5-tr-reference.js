import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const dsmSourcePath = path.resolve(currentDirPath, '../../../../docs/DSM5-TR.md');

const CODE_LINE_RE = /^([A-Z][0-9A-Z]{1,6}(?:\.[0-9A-Z]{1,4})?)\s+(.+)$/;
const PAGE_NUMBER_RE = /^\d+$/;
const SECTION_SKIP_LINES = new Set([
  'APPENDIX',
  'Alphabetical Listing of DSM-5-TR',
  'Diagnoses and ICD-10-CM Codes',
  'ICD-10-CM Disorder, condition, or problem',
]);

let cachedReferencePromise = null;

function cleanLine(line) {
  return String(line ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSearch(value) {
  return cleanLine(value).toLowerCase();
}

function looksLikeContinuationLine(line) {
  return /^[a-z(]/.test(line) || /^(code first|with |without |due to |sequela|other )/i.test(line);
}

function shouldAttachToHeading(detail) {
  return /^(with |without |in |unspecified$|mild$|moderate$|severe$|initial encounter$|subsequent encounter$)/i.test(detail);
}

function buildDescription(heading, detail) {
  if (!heading || !shouldAttachToHeading(detail)) return detail;
  return `${heading}, ${detail}`;
}

function buildReferenceIndex(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sectionStart = lines.findLastIndex((line) => cleanLine(line) === 'Alphabetical Listing of DSM-5-TR');
  if (sectionStart === -1) {
    throw new Error('Unable to locate DSM-5-TR alphabetical listing');
  }

  const sectionEnd = lines.findIndex(
    (line, index) => index > sectionStart && cleanLine(line) === 'Numerical Listing of DSM-5-TR',
  );
  if (sectionEnd === -1) {
    throw new Error('Unable to locate DSM-5-TR numerical listing boundary');
  }

  const dedupe = new Set();
  const items = [];
  let currentHeading = null;
  let currentEntry = null;

  for (const rawLine of lines.slice(sectionStart + 1, sectionEnd)) {
    const line = cleanLine(rawLine);
    if (!line || PAGE_NUMBER_RE.test(line) || SECTION_SKIP_LINES.has(line)) {
      continue;
    }
    if (line.startsWith('For periodic DSM-5-TR coding and other updates')) {
      continue;
    }

    const codeMatch = line.match(CODE_LINE_RE);
    if (codeMatch) {
      const [, code, detail] = codeMatch;
      const description = buildDescription(currentHeading, detail);
      const dedupeKey = `${code}::${description}`;
      if (!dedupe.has(dedupeKey)) {
        currentEntry = {
          code,
          codeSystem: 'DSM-5-TR',
          description,
          searchText: normalizeSearch(`${code} ${description}`),
        };
        dedupe.add(dedupeKey);
        items.push(currentEntry);
      }
      continue;
    }

    if (currentEntry && looksLikeContinuationLine(line)) {
      currentEntry.description = cleanLine(`${currentEntry.description} ${line}`);
      currentEntry.searchText = normalizeSearch(`${currentEntry.code} ${currentEntry.description}`);
      continue;
    }

    currentHeading = line;
    currentEntry = null;
  }

  return {
    itemCount: items.length,
    items,
  };
}

async function loadReferenceIndex() {
  const markdown = await readFile(dsmSourcePath, 'utf8');
  return buildReferenceIndex(markdown);
}

export function getDsm5TrReferenceIndex() {
  if (!cachedReferencePromise) {
    cachedReferencePromise = loadReferenceIndex();
  }
  return cachedReferencePromise;
}

function scoreItem(item, query) {
  const normalizedCode = item.code.toLowerCase();
  const normalizedDescription = item.description.toLowerCase();

  if (normalizedCode === query) return 600;
  if (normalizedCode.startsWith(query)) return 500;
  if (normalizedDescription.startsWith(query)) return 420;
  if (normalizedDescription.includes(` ${query}`)) return 340;
  if (item.searchText.includes(query)) return 240;
  return 0;
}

export async function searchDsm5TrDiagnoses(query, { limit = 12 } = {}) {
  const normalizedQuery = normalizeSearch(query);
  if (normalizedQuery.length < 2) return [];

  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 25));
  const reference = await getDsm5TrReferenceIndex();

  return reference.items
    .map((item) => ({ item, score: scoreItem(item, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.item.description.localeCompare(right.item.description);
    })
    .slice(0, safeLimit)
    .map(({ item }) => ({
      code: item.code,
      codeSystem: item.codeSystem,
      description: item.description,
    }));
}
