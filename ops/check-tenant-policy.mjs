import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example');

function parseEnv(text) {
  const map = new Map();
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) map.set(key, value);
  }
  return map;
}

function toBool(value) {
  return String(value || '').toLowerCase() === 'true';
}

function nonEmpty(value) {
  return String(value || '').trim().length > 0;
}

async function main() {
  let envExample = new Map();
  let hasEnvExample = false;
  try {
    const envExampleRaw = await fs.readFile(ENV_EXAMPLE_PATH, 'utf8');
    envExample = parseEnv(envExampleRaw);
    hasEnvExample = true;
  } catch {
    // Some environments do not commit .env.example; policy is still enforced via runtime env values.
  }

  const requiredKeys = [
    'ENABLE_TENANT_HOST_ROUTING',
    'TENANT_STRICT_HOST_ROUTING',
    'TENANT_ALLOWED_SLUGS',
    'TENANT_SLUG_CACHE_TTL_MS',
    'TENANT_DB_MAP',
  ];

  const missing = requiredKeys.filter((key) => !(process.env[key] || envExample.has(key)));
  if (hasEnvExample && missing.length) {
    console.error('[tenant-policy] Missing required keys in .env.example:', missing.join(', '));
    process.exit(1);
  }

  const effective = {
    NODE_ENV: process.env.NODE_ENV || envExample.get('NODE_ENV') || 'development',
    ENABLE_TENANT_HOST_ROUTING: process.env.ENABLE_TENANT_HOST_ROUTING || envExample.get('ENABLE_TENANT_HOST_ROUTING') || 'false',
    TENANT_STRICT_HOST_ROUTING: process.env.TENANT_STRICT_HOST_ROUTING || envExample.get('TENANT_STRICT_HOST_ROUTING') || 'false',
    TENANT_ALLOWED_SLUGS: process.env.TENANT_ALLOWED_SLUGS ?? envExample.get('TENANT_ALLOWED_SLUGS') ?? '',
    DB_NAME: process.env.DB_NAME || envExample.get('DB_NAME') || '',
  };

  const hostRoutingEnabled = toBool(effective.ENABLE_TENANT_HOST_ROUTING);
  const strictRoutingEnabled = toBool(effective.TENANT_STRICT_HOST_ROUTING);
  const nonLocalRuntime = !['development', 'test'].includes(String(effective.NODE_ENV).toLowerCase());

  if (hostRoutingEnabled && nonLocalRuntime && !strictRoutingEnabled) {
    console.error('[tenant-policy] Non-local tenant host routing requires TENANT_STRICT_HOST_ROUTING=true.');
    process.exit(1);
  }

  if (hostRoutingEnabled && strictRoutingEnabled) {
    const hasSlugAllowlist = nonEmpty(effective.TENANT_ALLOWED_SLUGS);
    const hasProvisioningSource = nonEmpty(effective.DB_NAME);
    if (!hasSlugAllowlist && !hasProvisioningSource) {
      console.error('[tenant-policy] Strict tenant routing requires TENANT_ALLOWED_SLUGS or DB_NAME for provisioning-backed tenant lookup.');
      process.exit(1);
    }
  }

  console.log('[tenant-policy] OK');
  console.log(`[tenant-policy] NODE_ENV=${effective.NODE_ENV}`);
  console.log(`[tenant-policy] ENABLE_TENANT_HOST_ROUTING=${effective.ENABLE_TENANT_HOST_ROUTING}`);
  console.log(`[tenant-policy] TENANT_STRICT_HOST_ROUTING=${effective.TENANT_STRICT_HOST_ROUTING}`);
}

main().catch((error) => {
  console.error('[tenant-policy] Check failed:', error?.message || error);
  process.exit(1);
});
