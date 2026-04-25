const SERVICE_NAME = 'churchcore-api';
const MAX_STRING_LENGTH = 240;
const MAX_OBJECT_KEYS = 40;
const MAX_ARRAY_ITEMS = 20;
const MAX_DEPTH = 4;
const REDACTED = '[redacted]';

const REDACTED_FIELD_PATTERN = /(?:authorization|cookie|password|secret|token|session|email|phone|address|body|payload|content|notes?|description|sql|query|statement)/i;

function truncate(value, maxLength = MAX_STRING_LENGTH) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeMessage(value) {
  let sanitized = collapseWhitespace(value);

  if (!sanitized) return undefined;

  sanitized = sanitized
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/(authorization|cookie|set-cookie|token|secret|password|passcode|session)(\s*[:=]\s*)([^,\s;]+)/gi, '$1$2[redacted]')
    .replace(/(value\s*:\s*)'[^']*'/gi, "$1'[redacted]'")
    .replace(/(value\s*:\s*)"[^"]*"/gi, '$1"[redacted]"');

  return truncate(sanitized);
}

function sanitizeStack(value) {
  if (typeof value !== 'string') return undefined;
  const lines = value
    .split('\n')
    .slice(1, 5)
    .map((line) => sanitizeMessage(line))
    .filter(Boolean);
  return lines.length ? lines : undefined;
}

function sanitizePrimitive(value, key = '') {
  if (value == null) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return String(value);
  if (value instanceof Date) return value.toISOString();

  if (typeof value !== 'string') {
    return truncate(collapseWhitespace(String(value)));
  }

  const sanitized = collapseWhitespace(value);
  if (!sanitized) return undefined;

  if (key === 'message') return sanitizeMessage(sanitized);
  if (key === 'stack') return sanitizeStack(sanitized);
  if (REDACTED_FIELD_PATTERN.test(key)) return REDACTED;
  return truncate(sanitized);
}

export function serializeError(error) {
  if (error instanceof Error) {
    const serialized = {
      name: sanitizePrimitive(error.name, 'name') ?? 'Error',
      message: sanitizeMessage(error.message ?? 'Unexpected error') ?? 'Unexpected error',
    };

    if (typeof error.code === 'string') serialized.code = sanitizePrimitive(error.code, 'code');
    if (typeof error.statusCode === 'number') serialized.statusCode = error.statusCode;
    if (typeof error.errno === 'number') serialized.errno = error.errno;
    if (typeof error.sqlState === 'string') serialized.sqlState = sanitizePrimitive(error.sqlState, 'sqlState');

    const stack = sanitizeStack(error.stack);
    if (stack) serialized.stack = stack;

    return serialized;
  }

  return {
    name: 'NonError',
    message: sanitizeMessage(String(error)) ?? 'Unexpected non-error rejection',
  };
}

function sanitizeValue(value, key = '', depth = 0) {
  if (depth > MAX_DEPTH) return undefined;
  if (value == null) return value;
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) {
    const sanitizedItems = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => sanitizeValue(entry, key, depth + 1))
      .filter((entry) => entry !== undefined);
    return sanitizedItems.length ? sanitizedItems : undefined;
  }

  if (typeof value === 'object') {
    const sanitized = {};
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
    for (const [childKey, childValue] of entries) {
      const nextValue = sanitizeValue(childValue, childKey, depth + 1);
      if (nextValue !== undefined) {
        sanitized[childKey] = nextValue;
      }
    }
    return Object.keys(sanitized).length ? sanitized : undefined;
  }

  return sanitizePrimitive(value, key);
}

function write(level, event, fields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    event,
    ...sanitizeValue(fields),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logInfo(event, fields = {}) {
  write('info', event, fields);
}

export function logWarn(event, fields = {}) {
  write('warn', event, fields);
}

export function logError(event, fields = {}) {
  write('error', event, fields);
}
