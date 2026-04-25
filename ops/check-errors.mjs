// In dev mode the API accepts x-staff-role headers directly
const devHeaders = {
  'x-staff-role': 'practice_admin',
  'x-tenant-id': 'system',
  'x-actor-id': 'diag-script',
  'content-type': 'application/json',
};

// Try to login with session cookie first (real auth)
const loginRes = await fetch('http://127.0.0.1:3001/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@churchcorecare.local', password: 'ChangeMe!Dev2024#' })
});
const setCookie = loginRes.headers.get('set-cookie');
const sessionCookie = setCookie?.split(';')[0];
console.log('Login:', loginRes.status, sessionCookie ? 'got cookie' : 'no cookie');

const authHeaders = sessionCookie
  ? { 'Cookie': sessionCookie }
  : devHeaders;
console.log('Using:', sessionCookie ? 'session cookie' : 'dev bypass headers');

// Try multiple monitoring endpoints
const endpoints = [
  '/v1/monitor/api-health',
  '/v1/monitor/summary',
  '/v1/monitor',
];

for (const ep of endpoints) {
  const r = await fetch('http://127.0.0.1:3001' + ep, {
    headers: authHeaders
  });
  const body = await r.json().catch(() => null);
  console.log(`\n${ep} [${r.status}]:`);
  if (body) console.log(JSON.stringify(body, null, 2).slice(0, 3000));
}
