import http from 'node:http';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT || 3002);
const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const publicDir = path.join(__dirname, 'public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function buildWebSecurityHeaders(requestUrl = '/') {
  const swaggerDocsRoute = requestUrl === '/api/docs' || requestUrl === '/api/docs/';
  return {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-xss-protection': '0',
    'referrer-policy': 'strict-origin-when-cross-origin',
    // Allow camera/microphone for Jitsi video sessions (embedded 8x8.vc iframe).
    // Geolocation remains blocked.
    'permissions-policy': 'geolocation=()',
    // Note: the Jitsi iframe also needs allowances — JitsiMeetExternalAPI
    // sets the iframe allow attribute internally via the External API script.
    'content-security-policy': swaggerDocsRoute
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://unpkg.com",
          "style-src 'self' 'unsafe-inline' https://unpkg.com",
          "connect-src 'self'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
      : [
          "default-src 'self'",
          // 8x8.vc hosts the JaaS/Jitsi External API script and iframes
          "script-src 'self' https://8x8.vc",
          "style-src 'self' 'unsafe-inline'",
          // Jitsi signaling (WebSocket + HTTPS) and WebRTC TURN/STUN
          "connect-src 'self' https://8x8.vc wss://8x8.vc wss://*.8x8.vc https://*.8x8.vc",
          "img-src 'self' data: https://8x8.vc https://*.8x8.vc",
          "font-src 'self' data:",
          // Jitsi Meet loads inside an iframe served from 8x8.vc
          "frame-src 'self' https://8x8.vc https://*.8x8.vc",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
    'cross-origin-opener-policy': 'same-origin',
    // Jitsi requires cross-origin resources; relax COEP for app pages
    'cross-origin-embedder-policy': swaggerDocsRoute ? 'unsafe-none' : 'unsafe-none',
  };
}

function applyWebSecurityHeaders(response, requestUrl) {
  for (const [header, value] of Object.entries(buildWebSecurityHeaders(requestUrl))) {
    response.setHeader(header, value);
  }
}

// ─── CSRF helpers (double-submit cookie pattern) ──────────────────────────────

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((p) => {
      const eq = p.indexOf('=');
      return eq === -1 ? [p.trim(), ''] : [p.slice(0, eq).trim(), p.slice(eq + 1).trim()];
    }),
  );
}

/**
 * Ensure a CSRF token cookie is set.  Returns the current token.
 * The cookie is NOT HttpOnly so JS can read it for the X-CSRF-Token header.
 */
function ensureCsrfCookie(request, response) {
  const cookies = parseCookies(request.headers.cookie);
  if (cookies[CSRF_COOKIE_NAME]) return cookies[CSRF_COOKIE_NAME];
  const token = crypto.randomBytes(32).toString('hex');
  const cookieFlags = ['SameSite=Strict', 'Path=/'];
  if (process.env.NODE_ENV === 'production') cookieFlags.push('Secure');
  response.setHeader('Set-Cookie', `${CSRF_COOKIE_NAME}=${token}; ${cookieFlags.join('; ')}`);
  return token;
}

/**
 * Validate CSRF on state-changing requests.
 * Returns true (and writes 403) if the check fails.
 */
function csrfCheckFailed(request, response) {
  if (CSRF_SAFE_METHODS.has(request.method ?? 'GET')) return false;
  // Auth login is allowed without CSRF (browser needs to POST before getting cookie)
  if (request.url?.replace('/api', '') === '/v1/auth/login') return false;
  const cookies = parseCookies(request.headers.cookie);
  const cookieToken  = cookies[CSRF_COOKIE_NAME];
  const headerToken  = request.headers[CSRF_HEADER_NAME];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    response.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'CSRF validation failed' }));
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────

const server = http.createServer(async (request, response) => {
  applyWebSecurityHeaders(response, request.url);

  // Ensure CSRF cookie on every request so the browser has a token to use
  ensureCsrfCookie(request, response);

  if (request.url?.startsWith('/api/')) {
    // CSRF check before proxying
    if (csrfCheckFailed(request, response)) return;
    await proxyApiRequest(request, response);
    return;
  }

  try {
    const url = resolvePublicUrl(request.url);
    const requestedPath = path.normalize(url).replace(/^\.\.(\/|\\|$)/, '');
    const filePath = path.join(publicDir, requestedPath);

    if (!filePath.startsWith(publicDir)) {
      writeText(response, 403, 'Forbidden');
      return;
    }

    const file = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const shouldDisableCache = extension === '.html' || requestedPath.includes('assets/');
    response.writeHead(200, {
      'content-type': contentTypes[extension] ?? 'application/octet-stream',
      'cache-control': shouldDisableCache ? 'no-cache' : 'public, max-age=3600',
    });
    response.end(file);
  } catch {
    if (request.url !== '/index.html') {
      try {
        const indexHtml = await readFile(path.join(publicDir, 'index.html'));
        response.writeHead(200, {
          'content-type': contentTypes['.html'],
          'cache-control': 'no-cache',
        });
        response.end(indexHtml);
        return;
      } catch {
        writeText(response, 404, 'Not Found');
        return;
      }
    }

    writeText(response, 404, 'Not Found');
  }
});

server.listen(port, () => {
  console.log(`Faith Counseling web app listening on port ${port}`);
});

function writeText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
  });
  response.end(text);
}

function resolvePublicUrl(requestUrl) {
  if (!requestUrl || requestUrl === '/') return '/index.html';
  // Strip query string before resolving the file path
  const pathname = requestUrl.split('?')[0];
  if (pathname === '/about' || pathname === '/about/') return '/about.html';
  if (pathname === '/monitor' || pathname === '/monitor/') return '/monitor.html';
  if (pathname === '/portal' || pathname === '/portal/') return '/portal.html';
  if (pathname === '/join' || pathname === '/join/') return '/join.html';
  return pathname;
}

async function proxyApiRequest(request, response) {
  if (!request.method || !['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
    response.writeHead(405, {
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const upstreamPath = request.url.replace('/api', '');
  const upstreamUrl = `${apiBaseUrl}${upstreamPath}`;

  try {
    const start = performance.now();
    const body = await readRequestBody(request);

    // Forward session cookie, correlation, and W3C trace context headers to the API.
    // Do NOT forward x-staff-role / x-tenant-id — identity comes from the session cookie.
    const forwardHeaders = {
      accept:         request.headers.accept ?? 'application/json',
      'content-type': request.headers['content-type'] ?? 'application/json; charset=utf-8',
    };
    if (request.headers.cookie)          forwardHeaders.cookie          = request.headers.cookie;
    if (request.headers['x-request-id']) forwardHeaders['x-request-id'] = request.headers['x-request-id'];
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
    });

    const responseText = await upstreamResponse.text();

    const responseHeaders = {
      'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
    };
    // Preserve any cookies set before proxying (for example CSRF cookie)
    // and merge with upstream Set-Cookie values (for example session cookie).
    const priorSetCookie = response.getHeader('Set-Cookie');
    const upstreamSetCookie = typeof upstreamResponse.headers.getSetCookie === 'function'
      ? upstreamResponse.headers.getSetCookie()
      : (upstreamResponse.headers.get('set-cookie') ? [upstreamResponse.headers.get('set-cookie')] : []);
    const mergedSetCookies = [
      ...(Array.isArray(priorSetCookie) ? priorSetCookie : priorSetCookie ? [priorSetCookie] : []),
      ...upstreamSetCookie,
    ];
    if (mergedSetCookies.length) {
      response.setHeader('Set-Cookie', mergedSetCookies);
    }
    response.writeHead(upstreamResponse.status, responseHeaders);
    response.end(responseText);
  } catch {
    response.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
    });
    response.end(
      JSON.stringify({
        error: 'API unavailable',
      }),
    );
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on('data', (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 1_000_000) {
        request.destroy();
        reject(new Error('Payload too large'));
      }
    });

    request.on('end', () => {
      const buf = Buffer.concat(chunks);
      resolve(buf.length > 0 ? buf : undefined);
    });

    request.on('error', reject);
  });
}

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body, null, 2));
}
