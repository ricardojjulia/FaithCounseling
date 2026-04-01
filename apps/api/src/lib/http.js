export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

const MAX_JSON_BODY_BYTES = 1_000_000;

function isJsonMediaType(contentType) {
  if (!contentType) return false;
  const mediaType = String(contentType).split(';')[0].trim().toLowerCase();
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

export function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const contentType = request.headers['content-type'];
    if (contentType && !isJsonMediaType(contentType)) {
      reject(new HttpError(415, 'Unsupported media type. Use application/json.'));
      return;
    }

    const contentLength = Number(request.headers['content-length'] || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
      reject(new HttpError(413, 'Payload too large'));
      return;
    }

    let buffer = '';
    let size = 0;

    request.on('data', (chunk) => {
      buffer += chunk;
      size += Buffer.byteLength(chunk);
      if (size > MAX_JSON_BODY_BYTES) {
        request.destroy(new HttpError(413, 'Payload too large'));
        reject(new HttpError(413, 'Payload too large'));
      }
    });

    request.on('end', () => {
      if (!buffer.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(buffer));
      } catch (error) {
        reject(new HttpError(400, 'Malformed JSON body'));
      }
    });

    request.on('error', reject);
  });
}

/**
 * Validates request body shape against an allowlist schema.
 *
 * @param {{ required?: string[], optional?: string[] }} schema
 * @param {unknown} body
 * @throws {HttpError} 400 if required fields are absent or unknown fields are present
 */
export function assertShape(schema, body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }

  const allowed = new Set([...(schema.required ?? []), ...(schema.optional ?? [])]);
  const unknown = Object.keys(body).filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    throw new HttpError(400, `Unexpected fields: ${unknown.join(', ')}`);
  }

  for (const field of schema.required ?? []) {
    const val = body[field];
    if (val === undefined || val === null || val === '') {
      throw new HttpError(400, `Missing required field: ${field}`);
    }
  }
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-xss-protection': '0',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(), microphone=(), camera=()',
  'content-security-policy': "default-src 'none'",
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'cross-origin-resource-policy': 'same-origin',
};

export function writeJson(response, statusCode, body) {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(header, value);
  }
  response.setHeader('cache-control', 'no-store');
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body, null, 2));
}