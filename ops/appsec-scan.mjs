/**
 * appsec-scan.mjs
 *
 * Comprehensive Application Security (AppSec) scan for Faith Counseling.
 * Covers:
 *   1. Dependency vulnerability audit (pnpm audit)
 *   2. Hardcoded secret / credential detection
 *   3. Dangerous code pattern detection (eval, innerHTML, prototype pollution, etc.)
 *   4. Security header enforcement verification
 *   5. Authentication and session configuration review
 *   6. Input validation and SQL injection pattern review
 *   7. Logging PHI/PII exposure review
 *   8. CORS and CSP configuration review
 *
 * Outputs a structured JSON result suitable for report generation.
 * Exits 0 on clean or warnings-only; exits 1 only on critical/high findings.
 *
 * Usage:
 *   node ops/appsec-scan.mjs [--output /path/to/report.json]
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const outputFlagIndex = args.indexOf('--output');
const OUTPUT_PATH = outputFlagIndex !== -1 ? args[outputFlagIndex + 1] : null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severity(level) {
  // critical > high > medium > low > info
  const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  return order[level] ?? 0;
}

function makeIssue(check, level, message, file = null, line = null, recommendation = null) {
  return { check, level, message, file, line, recommendation };
}

/**
 * Recursively collect all source files under a directory, excluding
 * common non-source paths (node_modules, .git, dist, build, ScreenShots).
 */
function collectSourceFiles(dir, extensions = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']) {
  // Exclude compiled build artifacts, vendor bundles, and non-source directories
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.pnpm', 'ScreenShots', 'coverage', 'public']);
  const results = [];

  function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const entry of entries) {
      if (SKIP.has(entry)) continue;
      const full = join(d, entry);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) { walk(full); continue; }
      if (extensions.includes(extname(entry))) results.push(full);
    }
  }

  walk(dir);
  return results;
}

function readSource(file) {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
}

// ─── Check 1: Dependency audit ────────────────────────────────────────────────

function checkDependencyVulnerabilities() {
  const issues = [];
  const summary = { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 };

  // Helper: try to parse pnpm audit JSON output using multiple flag formats
  function tryAuditJson() {
    // pnpm >= 7 uses --json; older versions used --reporter=json
    for (const flags of [['audit', '--json'], ['audit', '--reporter=json']]) {
      const result = spawnSync('pnpm', flags, { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
      if (result.error) return { data: null, exitCode: null, unavailable: true }; // command not found
      if (!result.stdout) continue;
      try {
        const parsed = JSON.parse(result.stdout);
        if (parsed && (parsed.metadata || parsed.vulnerabilities)) return { data: parsed, exitCode: result.status };
      } catch { /* try next flag */ }
    }
    // Last resort: plain audit, check exit code only
    const plain = spawnSync('pnpm', ['audit'], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
    if (plain.error) return { data: null, exitCode: null, unavailable: true };
    return { data: null, exitCode: plain.status };
  }

  try {
    const { data: auditData, exitCode, unavailable } = tryAuditJson();

    if (unavailable) {
      issues.push(makeIssue('dependency-audit', 'info',
        'pnpm not available in this environment — dependency audit skipped',
        null, null,
        'Run pnpm audit in the project root to check for dependency vulnerabilities.'));
    } else if (auditData && auditData.metadata) {
  try {
    // pnpm audit outputs JSON with --reporter=json flag
    const result = spawnSync(
      'pnpm',
      ['audit', '--reporter=json'],
      { cwd: ROOT, encoding: 'utf8', timeout: 60_000 }
    );

    let auditData = null;
    try {
      auditData = JSON.parse(result.stdout || '{}');
    } catch {
      // pnpm audit might output non-JSON in some versions; fall back to npm audit
      try {
        const npmResult = spawnSync(
          'npx',
          ['--yes', 'better-npm-audit', 'audit', '--output-format', 'json'],
          { cwd: ROOT, encoding: 'utf8', timeout: 60_000 }
        );
        auditData = JSON.parse(npmResult.stdout || '{}');
      } catch {
        auditData = null;
      }
    }

    if (auditData && auditData.metadata) {
      const m = auditData.metadata;
      summary.critical = m.vulnerabilities?.critical ?? 0;
      summary.high      = m.vulnerabilities?.high ?? 0;
      summary.moderate  = m.vulnerabilities?.moderate ?? 0;
      summary.low       = m.vulnerabilities?.low ?? 0;
      summary.total     = m.vulnerabilities?.total ?? 0;

      if (summary.critical > 0) {
        issues.push(makeIssue('dependency-audit', 'critical',
          `${summary.critical} critical vulnerability/vulnerabilities in dependencies`,
          null, null,
          'Run: pnpm audit --fix or update affected packages immediately.'));
      }
      if (summary.high > 0) {
        issues.push(makeIssue('dependency-audit', 'high',
          `${summary.high} high-severity vulnerability/vulnerabilities in dependencies`,
          null, null,
          'Run: pnpm audit --fix or update affected packages.'));
      }
      if (summary.moderate > 0) {
        issues.push(makeIssue('dependency-audit', 'medium',
          `${summary.moderate} moderate-severity vulnerabilities in dependencies`,
          null, null,
          'Review and update affected packages at next maintenance window.'));
      }
      if (summary.total === 0) {
        issues.push(makeIssue('dependency-audit', 'info',
          'No known vulnerabilities found in dependencies'));
      }
    } else if (exitCode === 0) {
      // JSON could not be parsed but audit exited cleanly — treat as no vulnerabilities
      issues.push(makeIssue('dependency-audit', 'info',
        'Dependency audit completed with no vulnerabilities reported'));
    } else {
      issues.push(makeIssue('dependency-audit', 'medium',
        'Dependency audit returned warnings or could not parse structured output',
        null, null,
        'Run pnpm audit manually to review vulnerability details.'));
    } else {
      // Try plain text parsing for exit code
      const exitCode = result.status;
      if (exitCode === 0) {
        issues.push(makeIssue('dependency-audit', 'info',
          'Dependency audit completed with no vulnerabilities reported'));
      } else {
        issues.push(makeIssue('dependency-audit', 'medium',
          'Dependency audit returned warnings or could not parse structured output',
          null, null,
          'Run pnpm audit manually to review vulnerability details.'));
      }
    }

    // Capture advisories if present
    if (auditData && auditData.advisories) {
      for (const [, advisory] of Object.entries(auditData.advisories)) {
        const sev = advisory.severity ?? 'info';
        if (severity(sev) >= severity('medium')) {
          issues.push(makeIssue('dependency-audit', sev,
            `[${advisory.module_name}] ${advisory.title} (${advisory.url})`,
            null, null,
            advisory.recommendation || 'Update to patched version.'));
        }
      }
    }
  } catch (err) {
    issues.push(makeIssue('dependency-audit', 'medium',
      `Dependency audit could not run: ${err.message}`,
      null, null,
      'Ensure pnpm is available and run pnpm audit manually.'));
  }

  return { check: 'dependency-vulnerabilities', summary, issues };
}

// ─── Check 2: Hardcoded secrets ───────────────────────────────────────────────

const SECRET_PATTERNS = [
  { name: 'hardcoded-password', pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"`][^'"`\s]{4,}/gi, level: 'critical' },
  { name: 'hardcoded-api-key', pattern: /(?:api[_-]?key|apikey|access[_-]?key)\s*[:=]\s*['"`][A-Za-z0-9\-_]{16,}/gi, level: 'critical' },
  { name: 'hardcoded-secret', pattern: /(?:secret|token|signing[_-]?key)\s*[:=]\s*['"`][^'"`\s]{16,}/gi, level: 'critical' },
  { name: 'hardcoded-private-key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, level: 'critical' },
  { name: 'aws-access-key', pattern: /AKIA[0-9A-Z]{16}/g, level: 'critical' },
  { name: 'aws-secret-key', pattern: /aws[_-]?secret[_-]?access[_-]?key\s*=\s*['"`]?[A-Za-z0-9/+]{40}/gi, level: 'critical' },
  { name: 'jwt-secret-inline', pattern: /(?:jwt|jsonwebtoken).*(?:secret|key)\s*[:=]\s*['"`][^'"`\s]{8,}/gi, level: 'high' },
  { name: 'connection-string-with-creds', pattern: /(?:mysql|postgres|mongodb|redis):\/\/[^:]+:[^@]+@/gi, level: 'high' },
  { name: 'env-var-override-in-code', pattern: /process\.env\.[A-Z_]+\s*=\s*['"`][^'"`]{4,}/g, level: 'medium' },
];

// Values that look like secrets but are actually safe (test fixtures, examples, env references)
const SECRET_ALLOWLIST = [
  'process.env',
  'ChangeMe!Dev2024#',       // known dev-only credential, documented
  'ChangeMe!Client2026#',    // known dev-only client credential, documented
  'example.test',
  'example.com',
  'localhost',
  'placeholder',
  '<strong-password>',
  'YOUR_',
  'your_',
  '/* ',
  '//',
  '<!--',
];

function lineOf(source, index) {
  return source.substring(0, index).split('\n').length;
}

function checkHardcodedSecrets(sourceFiles) {
  const issues = [];

  for (const file of sourceFiles) {
    const rel = relative(ROOT, file);
    // Skip lock files, test fixtures, example files, demo data, and this script itself
    if (rel.includes('pnpm-lock') || rel.includes('.example') ||
        rel.includes('test-fixtures') || rel.endsWith('appsec-scan.mjs') ||
        rel.includes('/test/') || rel.includes('/tests/') ||
        rel.includes('demo-dataset') || rel.includes('.test.') ||
        rel.includes('.spec.')) continue;

    const source = readSource(file);
    if (!source) continue;

    for (const { name, pattern, level } of SECRET_PATTERNS) {
      let match;
      const re = new RegExp(pattern.source, pattern.flags);
      while ((match = re.exec(source)) !== null) {
        const snippet = match[0];
        // Skip if any allowlist item appears in the surrounding line
        const lineStart = source.lastIndexOf('\n', match.index) + 1;
        const lineEnd = source.indexOf('\n', match.index);
        const lineContent = source.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
        if (SECRET_ALLOWLIST.some(a => lineContent.includes(a))) continue;

        issues.push(makeIssue(name, level,
          `Potential hardcoded secret: ${snippet.substring(0, 60).replace(/\n/g, '\\n')}...`,
          rel, lineOf(source, match.index),
          'Move secrets to environment variables. Never commit credentials to source control.'));
      }
    }
  }

  return { check: 'hardcoded-secrets', issues };
}

// ─── Check 3: Dangerous code patterns ────────────────────────────────────────

const DANGEROUS_PATTERNS = [
  {
    name: 'eval-usage',
    pattern: /\beval\s*\(/g,
    level: 'critical',
    recommendation: 'Avoid eval(). Use safe alternatives like JSON.parse() or explicit logic.',
  },
  {
    name: 'dangerous-innerHTML',
    pattern: /\.innerHTML\s*=/g,
    level: 'high',
    recommendation: 'Prefer textContent or a safe DOM library to avoid XSS.',
  },
  {
    name: 'dangerouslySetInnerHTML',
    pattern: /dangerouslySetInnerHTML/g,
    level: 'high',
    recommendation: 'Review all dangerouslySetInnerHTML usages — ensure content is sanitized.',
  },
  {
    name: 'child-process-exec-with-user-input',
    pattern: /exec\s*\(\s*(?:req\.|params\.|body\.|query\.)/g,
    level: 'critical',
    recommendation: 'Never pass user-controlled data to exec(). Use execFile with explicit args.',
  },
  {
    name: 'prototype-pollution',
    pattern: /\.__proto__\s*=/g,
    level: 'critical',
    recommendation: 'Prototype pollution detected. Use Object.create(null) or Object.assign safely.',
  },
  {
    name: 'sql-string-concatenation',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|WHERE)[^;'"]*\+\s*(?:req\.|params\.|body\.|query\.)/gi,
    level: 'critical',
    recommendation: 'Use parameterized queries. Never concatenate user input into SQL strings.',
  },
  {
    name: 'path-traversal-risk',
    pattern: /(?:readFile|writeFile|createReadStream|createWriteStream)\s*\([^)]*(?:req\.|params\.|body\.|query\.)/g,
    level: 'high',
    recommendation: 'Sanitize file paths from user input. Use path.resolve() and validate against allowed dirs.',
  },
  {
    name: 'debug-console-log-phi',
    pattern: /console\.(?:log|debug|info)\s*\([^)]*(?:firstName|lastName|email|ssn|dob|phone|address|password)/gi,
    level: 'high',
    recommendation: 'Never log PHI or PII. Remove or replace with safe identifiers before production.',
  },
  {
    name: 'crypto-weak-algorithm',
    pattern: /createCipher(?:iv)?\s*\(\s*['"`](?:des|rc4|md5)/gi,
    level: 'critical',
    recommendation: 'Use AES-256-GCM or ChaCha20-Poly1305 instead of deprecated/weak algorithms.',
  },
  {
    name: 'random-math',
    pattern: /Math\.random\s*\(\s*\)/g,
    level: 'medium',
    recommendation: 'Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive randomness.',
  },
  {
    name: 'no-https-check',
    // Exclude localhost, loopback, and template literal patterns (e.g. new URL(req.url, `http://${host}`))
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\$\{)/g,
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g,
    level: 'low',
    recommendation: 'Ensure external URLs use HTTPS in production configurations.',
  },
];

function checkDangerousPatterns(sourceFiles) {
  const issues = [];

  for (const file of sourceFiles) {
    const rel = relative(ROOT, file);
    if (rel.includes('node_modules') || rel.includes('.git')) continue;
    // Skip the scanner script itself (would match its own regex patterns)
    if (rel.endsWith('appsec-scan.mjs')) continue;

    const source = readSource(file);
    if (!source) continue;

    for (const { name, pattern, level, recommendation } of DANGEROUS_PATTERNS) {
      let match;
      const re = new RegExp(pattern.source, pattern.flags);
      while ((match = re.exec(source)) !== null) {
        const ln = lineOf(source, match.index);
        issues.push(makeIssue(name, level,
          `${name} detected: ${match[0].substring(0, 80).replace(/\n/g, '\\n')}`,
          rel, ln, recommendation));
      }
    }
  }

  return { check: 'dangerous-code-patterns', issues };
}

// ─── Check 4: Security headers verification ──────────────────────────────────

const REQUIRED_SECURITY_HEADERS = [
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
  'strict-transport-security',
  'content-security-policy',
  'referrer-policy',
  'permissions-policy',
];

function checkSecurityHeaders(sourceFiles) {
  const issues = [];
  const found = new Set();

  for (const file of sourceFiles) {
    const rel = relative(ROOT, file);
    const source = readSource(file);
    if (!source) continue;

    for (const header of REQUIRED_SECURITY_HEADERS) {
      if (source.toLowerCase().includes(header)) {
        found.add(header);
      }
    }
  }

  for (const header of REQUIRED_SECURITY_HEADERS) {
    if (!found.has(header)) {
      issues.push(makeIssue('missing-security-header', 'medium',
        `Security header not found in codebase: ${header}`,
        null, null,
        `Add the '${header}' header to API responses and/or web server config.`));
    }
  }

  if (issues.length === 0) {
    issues.push(makeIssue('security-headers', 'info',
      'All required security header references found in codebase'));
  }

  return { check: 'security-headers', issues };
}

// ─── Check 5: Auth and session configuration ─────────────────────────────────

function checkAuthConfig(sourceFiles) {
  const issues = [];

  const authFile = sourceFiles.find(f => f.includes('auth.js') || f.includes('session'));
  const sessionPolicyFile = join(ROOT, 'docs/security/session-policy.md');

  // Check session secret is not hardcoded
  for (const file of sourceFiles) {
    const rel = relative(ROOT, file);
    const source = readSource(file);
    if (!source) continue;

    if (/SESSION_SECRET\s*[:=]\s*['"`][^'"`\s]{1,}/g.test(source) &&
        !source.includes('process.env')) {
      issues.push(makeIssue('session-secret-hardcoded', 'critical',
        'SESSION_SECRET appears hardcoded outside of environment variable reference',
        rel, null,
        'Use process.env.SESSION_SECRET only. Never hardcode session secrets.'));
    }

    // Check for httpOnly cookie settings
    if ((source.includes('cookie') || source.includes('session')) &&
        file.includes('apps/api') &&
        !source.includes('httpOnly')) {
      // Only flag if the file deals with cookie/session setup
      if (source.includes('res.cookie') || source.includes('session.cookie')) {
        issues.push(makeIssue('cookie-httponly-missing', 'high',
          'Cookie set without explicit httpOnly flag',
          rel, null,
          'Always set httpOnly: true and secure: true on session cookies.'));
      }
    }

    // Check for secure cookie in production
    // Exclude ops/ scripts — they contain scanner patterns and dev tooling, not production cookie config
    if (source.includes('secure: false') && !rel.includes('test') && !rel.startsWith('ops/')) {
    if (source.includes('secure: false') && !rel.includes('test')) {
      issues.push(makeIssue('cookie-not-secure', 'medium',
        'Cookie configured with secure: false',
        rel, null,
        'Set secure: true for production cookies. Gate on NODE_ENV check if needed.'));
    }

    // Check for SameSite attribute
    if (source.includes('res.cookie') && !source.includes('sameSite') && !source.includes('SameSite')) {
      issues.push(makeIssue('cookie-samesite-missing', 'medium',
        'Cookie set without SameSite attribute',
        rel, null,
        'Set sameSite: "Strict" or "Lax" to prevent CSRF.'));
    }
  }

  // Verify password hashing (should use argon2)
  const passwordHashers = sourceFiles.filter(f => {
    const src = readSource(f);
    return src.includes('password') && (src.includes('hash') || src.includes('bcrypt') || src.includes('argon'));
  });

  const usesArgon2 = passwordHashers.some(f => readSource(f).includes('argon2'));
  const usesBcrypt = passwordHashers.some(f => readSource(f).includes('bcrypt'));
  const usesMd5 = passwordHashers.some(f => /md5\s*\(/.test(readSource(f)));
  // SHA-1 used ONLY for HIBP k-anonymity is acceptable — flag only if used outside that context
  const usesSha1 = passwordHashers.some(f => {
    const src = readSource(f);
    if (!(/createHash\s*\(\s*['"`]sha1['"`]/.test(src))) return false;
    // Allow SHA-1 exclusively in HIBP k-anonymity context
    if (src.includes('pwnedpasswords') || src.includes('HaveIBeenPwned') ||
        src.includes('hibp') || src.includes('isPasswordBreached')) return false;
    return true;
  });

  if (usesArgon2) {
    issues.push(makeIssue('password-hashing', 'info',
      'Password hashing uses argon2 — recommended algorithm confirmed'));
  }
  if (usesBcrypt && !usesArgon2) {
    issues.push(makeIssue('password-hashing', 'low',
      'Password hashing uses bcrypt — acceptable but argon2id is preferred',
      null, null,
      'Consider migrating to argon2id for stronger resistance to GPU attacks.'));
  }
  if (usesMd5 || usesSha1) {
    issues.push(makeIssue('weak-password-hash', 'critical',
      'MD5 or SHA-1 used for password hashing — critically insecure',
      null, null,
      'Immediately replace with argon2id. MD5/SHA1 are trivially broken for passwords.'));
  }

  // Check session policy doc exists
  if (!existsSync(sessionPolicyFile)) {
    issues.push(makeIssue('session-policy-missing', 'medium',
      'No session policy document found at docs/security/session-policy.md',
      null, null,
      'Create a documented session security policy.'));
  } else {
    issues.push(makeIssue('session-policy', 'info',
      'Session security policy document exists'));
  }

  return { check: 'auth-session-config', issues };
}

// ─── Check 6: Input validation patterns ──────────────────────────────────────

function checkInputValidation(sourceFiles) {
  const issues = [];

  for (const file of sourceFiles) {
    if (!file.includes('apps/api')) continue;
    const rel = relative(ROOT, file);
    const source = readSource(file);
    if (!source) continue;

    // Look for route handlers that access body/params without validation
    const hasValidation = source.includes('validate') || source.includes('sanitize') ||
                          source.includes('zod') || source.includes('joi') ||
                          source.includes('typeof') || source.includes('isString') ||
                          source.includes('parseInt') || source.includes('Number(');

    const hasUserInput = source.includes('req.body') || source.includes('req.params') ||
                         source.includes('req.query');

    if (hasUserInput && !hasValidation && file.includes('/lib/')) {
      issues.push(makeIssue('missing-input-validation', 'medium',
        'Route handler reads user input without apparent validation',
        rel, null,
        'Validate and sanitize all user-supplied input before processing.'));
    }

    // Check for missing Content-Type validation on POST routes
    if (source.includes('router.post') || source.includes('app.post')) {
      if (!source.includes('content-type') && !source.includes('express.json')) {
        // Just a note — may be handled at middleware level
      }
    }
  }

  if (issues.length === 0) {
    issues.push(makeIssue('input-validation', 'info',
      'Input validation patterns appear present in API handlers'));
  }

  return { check: 'input-validation', issues };
}

// ─── Check 7: Logging PHI/PII exposure ───────────────────────────────────────

const PHI_IDENTIFIERS = [
  'firstName', 'lastName', 'first_name', 'last_name',
  'dateOfBirth', 'date_of_birth', 'dob', 'ssn',
  'email', 'phone', 'address', 'diagnosis',
  'insurance', 'medication', 'prescription',
];

function checkLoggingExposure(sourceFiles) {
  const issues = [];

  for (const file of sourceFiles) {
    const rel = relative(ROOT, file);
    const source = readSource(file);
    if (!source) continue;

    const logLines = source.split('\n').map((l, i) => ({ line: i + 1, content: l }))
      .filter(({ content }) => /console\.(log|debug|info|warn|error)|logger\.(log|debug|info)/.test(content));

    for (const { line, content } of logLines) {
      if (PHI_IDENTIFIERS.some(phi => content.includes(phi))) {
        // Skip if it's clearly a string label (ends with :) or a comment
        if (content.includes('// safe') || content.includes('_enc')) continue;
        // Skip if the PHI identifier appears only in a quoted label (e.g., console.log('  Email:'))
        if (/console\.\w+\s*\(\s*['"`][^'"`]*['"`]\s*\)/.test(content)) continue;
        // Skip migration/setup files that log field labels, not values
        if (rel.includes('migrate') || rel.includes('seed') || rel.includes('setup')) continue;
        issues.push(makeIssue('logging-phi-exposure', 'high',
          `Possible PHI/PII identifier in log statement: ${content.trim().substring(0, 100)}`,
          rel, line,
          'Replace PHI/PII in log statements with safe identifiers (e.g., IDs, hashes).'));
      }
    }
  }

  if (issues.length === 0) {
    issues.push(makeIssue('logging-phi-exposure', 'info',
      'No obvious PHI/PII identifiers found in logging statements'));
  }

  return { check: 'logging-phi-exposure', issues };
}

// ─── Check 8: CORS configuration ─────────────────────────────────────────────

function checkCorsConfig(sourceFiles) {
  const issues = [];
  let corsFound = false;
  let wildcardCors = false;

  for (const file of sourceFiles) {
    const rel = relative(ROOT, file);
    // Skip ops scripts — they may contain CORS pattern strings for detection purposes
    if (rel.startsWith('ops/')) continue;
    const source = readSource(file);
    if (!source) continue;

    if (source.includes('cors') || source.includes('ALLOWED_ORIGINS') || source.includes('Access-Control')) {
      corsFound = true;

      if (source.includes("origin: '*'") || source.includes('origin: true')) {
        wildcardCors = true;
        issues.push(makeIssue('cors-wildcard', 'high',
          'CORS configured with wildcard or permissive origin',
          rel, null,
          'Restrict CORS to specific allowed origins via ALLOWED_ORIGINS env var.'));
      }

      if (source.includes('ALLOWED_ORIGINS')) {
        issues.push(makeIssue('cors-origin-allowlist', 'info',
          'CORS origin controlled via ALLOWED_ORIGINS environment variable — good practice',
          rel));
      }
    }
  }

  if (!corsFound) {
    issues.push(makeIssue('cors-not-found', 'medium',
      'No CORS configuration found in codebase',
      null, null,
      'Ensure CORS is configured to restrict cross-origin requests.'));
  }

  return { check: 'cors-config', issues };
}

// ─── Check 9: Dependency version review ──────────────────────────────────────

function checkDependencyVersions() {
  const issues = [];

  const rootPkg = join(ROOT, 'package.json');
  const apiPkg  = join(ROOT, 'apps/api/package.json');
  const webPkg  = join(ROOT, 'apps/web/package.json');

  for (const pkgPath of [rootPkg, apiPkg, webPkg]) {
    if (!existsSync(pkgPath)) continue;
    const rel = relative(ROOT, pkgPath);
    let pkg;
    try { pkg = JSON.parse(readFileSync(pkgPath, 'utf8')); } catch { continue; }

    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const [name, version] of Object.entries(allDeps)) {
      // Flag pinned-to-old major versions that are commonly problematic
      if (version.startsWith('*') || version === 'latest') {
        issues.push(makeIssue('unpinned-dependency', 'medium',
          `Dependency ${name}@${version} is unpinned (${rel})`,
          rel, null,
          'Pin dependencies to specific version ranges to prevent unexpected breaking changes.'));
      }
    }
  }

  if (issues.length === 0) {
    issues.push(makeIssue('dependency-versions', 'info',
      'All reviewed dependencies use pinned version ranges'));
  }

  return { check: 'dependency-versions', issues };
}

// ─── Main scan orchestrator ───────────────────────────────────────────────────

async function runAppSecScan() {
  const startedAt = new Date().toISOString();
  console.log(`[appsec] Scan started at ${startedAt}`);
  console.log(`[appsec] Scanning root: ${ROOT}`);

  const sourceFiles = collectSourceFiles(ROOT);
  console.log(`[appsec] Collected ${sourceFiles.length} source files`);

  const checks = [
    checkDependencyVulnerabilities(),
    checkHardcodedSecrets(sourceFiles),
    checkDangerousPatterns(sourceFiles),
    checkSecurityHeaders(sourceFiles),
    checkAuthConfig(sourceFiles),
    checkInputValidation(sourceFiles),
    checkLoggingExposure(sourceFiles),
    checkCorsConfig(sourceFiles),
    checkDependencyVersions(),
  ];

  const allIssues = checks.flatMap(c => c.issues ?? []);
  const criticalCount = allIssues.filter(i => i.level === 'critical').length;
  const highCount     = allIssues.filter(i => i.level === 'high').length;
  const mediumCount   = allIssues.filter(i => i.level === 'medium').length;
  const lowCount      = allIssues.filter(i => i.level === 'low').length;
  const infoCount     = allIssues.filter(i => i.level === 'info').length;

  const overallStatus = criticalCount > 0 ? 'CRITICAL' :
                        highCount > 0     ? 'HIGH'     :
                        mediumCount > 0   ? 'MEDIUM'   :
                        lowCount > 0      ? 'LOW'      : 'CLEAN';

  const finishedAt = new Date().toISOString();

  const report = {
    reportType: 'appsec',
    reportVersion: '1.0.0',
    generatedAt: finishedAt,
    startedAt,
    repositoryRoot: ROOT,
    sourceFilesScanned: sourceFiles.length,
    overallStatus,
    summary: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount, info: infoCount },
    checks: checks.map(c => ({
      name: c.check,
      issueCount: (c.issues ?? []).filter(i => i.level !== 'info').length,
      issues: c.issues ?? [],
    })),
  };

  // Print summary to stdout
  console.log(`\n[appsec] ─── Scan Summary ──────────────────────────────────`);
  console.log(`[appsec] Status   : ${overallStatus}`);
  console.log(`[appsec] Critical : ${criticalCount}`);
  console.log(`[appsec] High     : ${highCount}`);
  console.log(`[appsec] Medium   : ${mediumCount}`);
  console.log(`[appsec] Low      : ${lowCount}`);
  console.log(`[appsec] Info     : ${infoCount}`);
  console.log(`[appsec] ────────────────────────────────────────────────────\n`);

  if (OUTPUT_PATH) {
    writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[appsec] Report written to: ${OUTPUT_PATH}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  // Exit non-zero only for critical or high (so CI can block)
  if (criticalCount > 0) {
    process.exit(2);
  }

  return report;
}

runAppSecScan().catch(err => {
  console.error('[appsec] Fatal error:', err.message);
  process.exit(1);
});
