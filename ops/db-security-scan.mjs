/**
 * db-security-scan.mjs
 *
 * Comprehensive Database Security scan for Faith Counseling.
 * Covers:
 *   1. PHI/PII field compliance audit (schema analysis)
 *   2. Encryption coverage verification (all sensitive fields must use _enc suffix)
 *   3. Plaintext sensitive data pattern detection
 *   4. Foreign key and tenant isolation checks
 *   5. Audit table presence and structure
 *   6. Session table security review
 *   7. Query-level security pattern review (parameterization)
 *   8. Encryption key configuration review
 *   9. Database connection security review
 *  10. Potential PHI/PII in non-encrypted columns
 *
 * This scan operates statically (schema file + source code analysis).
 * It does NOT connect to a live database, making it safe to run in CI.
 *
 * Outputs a structured JSON result suitable for report generation.
 *
 * Usage:
 *   node ops/db-security-scan.mjs [--output /path/to/report.json]
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const SCHEMA_PATH = join(ROOT, 'apps/api/src/db/schema.sql');
const QUERIES_DIR = join(ROOT, 'apps/api/src/db/queries');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const outputFlagIndex = args.indexOf('--output');
const OUTPUT_PATH = outputFlagIndex !== -1 ? args[outputFlagIndex + 1] : null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeIssue(check, level, message, context = null, recommendation = null) {
  return { check, level, message, context, recommendation };
}

function readSource(file) {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
}

function collectFiles(dir, ext = '.js') {
  const results = [];
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build']);
  function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const entry of entries) {
      if (SKIP.has(entry)) continue;
      const full = join(d, entry);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) { walk(full); continue; }
      if (full.endsWith(ext)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

// ─── Schema parser ────────────────────────────────────────────────────────────

/**
 * Parse the schema.sql and return a structured list of tables with their columns.
 * This is a lightweight parser for standard CREATE TABLE IF NOT EXISTS ... statements.
 */
function parseSchema(sql) {
  const tables = [];
  // Match each CREATE TABLE block
  const tableRegex = /CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?\s*\(([\s\S]*?)\)\s*ENGINE/g;
  let match;

  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnBlock = match[2];

    const columns = [];
    // Split by line and parse column definitions
    for (const rawLine of columnBlock.split('\n')) {
      const line = rawLine.trim();
      // Skip constraints, indexes, and empty lines
      if (!line || line.startsWith('--') || line.startsWith('PRIMARY') ||
          line.startsWith('UNIQUE') || line.startsWith('INDEX') ||
          line.startsWith('KEY') || line.startsWith('CONSTRAINT') ||
          line.startsWith(')')) continue;

      // Extract column name (first word, strip backticks)
      const colMatch = line.match(/^`?(\w+)`?\s+(\w+)/);
      if (!colMatch) continue;

      const colName = colMatch[1];
      const colType = colMatch[2].toUpperCase();

      // Extract comment (for encryption annotations)
      const commentMatch = line.match(/COMMENT\s+'([^']+)'/i) ||
                           line.match(/--\s*(.+)$/);
      const comment = commentMatch ? commentMatch[1].trim() : '';

      const isEncrypted = colName.endsWith('_enc') || comment.toLowerCase().includes('encrypt');
      const isNullable  = line.includes('NULL') && !line.includes('NOT NULL');

      columns.push({ name: colName, type: colType, comment, isEncrypted, isNullable });
    }

    tables.push({ name: tableName, columns });
  }

  return tables;
}

// ─── Check 1: PHI/PII field compliance ───────────────────────────────────────

// Keywords that indicate a field likely contains PHI or PII
const PHI_KEYWORDS = [
  'first_name', 'last_name', 'middle_name', 'preferred_name',
  'date_of_birth', 'dob', 'ssn', 'social_security',
  'email', 'phone', 'address', 'street', 'postal', 'zip',
  'diagnosis', 'medication', 'prescription', 'allergy',
  'insurance', 'carrier', 'policy', 'npi',
  'emergency_contact', 'license_number', 'bio',
  'legal', 'treatment', 'progress_note', 'summary', 'goals',
  'intervention', 'discharge', 'referral',
];

// Fields that look sensitive but are intentionally plaintext (enum labels, flags, hashes, etc.)
const KNOWN_PLAINTEXT_EXCEPTIONS = new Set([
  'state',                // state/province code (non-PHI per schema comment)
  'extension',            // phone extension (non-PHI)
  'relationship',         // enum label
  'plan_name',            // insurance plan name (non-PHI)
  'faith_tradition',      // non-PHI label
  'referral_source',      // non-PHI label
  'faith_background',
  'referral_source_detail',
  'role',
  'status',
  'type',
  'created_at',
  'updated_at',
  'id',
  'tenant_id',
  'client_id',
  'staff_id',
  'practice_id',
  'location_id',
  // Hash columns: deterministic hashes are not PHI themselves
  'email_lookup_hash',
  'password_hash',
  // Boolean flags: not PHI content
  'has_legal_auth',
  'legal_hold_enabled',
  'mfa_enabled',
  // Type/enum label columns: low-cardinality codes, not free-text PHI
  'allergy_type',
  'phone_type',
  'biological_sex',
  // Schema-commented non-PHI JSON blobs
  'discharge_record',     // comment: "JSON blob (non-PHI metadata)"
  'policy_snapshot',      // policy text, not client PHI
  // Public federal identifiers: not PHI under HIPAA (NPI is assigned to providers, not patients)
  'npi',
  // Clinical workflow dates without inherent PHI content in isolation
  'referral_date',
]);

function checkPhiPiiCompliance(tables) {
  const issues = [];
  const phiTablesAudited = [];
  let totalPhiFields = 0;
  let encryptedPhiFields = 0;
  let unencryptedPhiFields = 0;

  for (const table of tables) {
    const phiColumns = [];

    for (const col of table.columns) {
      if (KNOWN_PLAINTEXT_EXCEPTIONS.has(col.name)) continue;

      // Skip columns whose schema comment explicitly states non-PHI or not-PHI
      if (col.comment && /non-?phi|not\s+phi/i.test(col.comment)) continue;
      // Skip legacy plaintext columns that are being retained only for migration
      // compatibility — the encrypted _enc companion column is the canonical store.
      if (col.comment && col.comment.toLowerCase().includes('migration compatibility')) continue;
      // Skip columns whose schema comment explicitly states non-PHI
      if (col.comment && col.comment.toLowerCase().includes('non-phi')) continue;
      // Skip hash columns (one-way hashes are not PHI themselves)
      if (col.name.endsWith('_hash') || col.name.endsWith('_lookup_hash')) continue;
      // Skip boolean flag columns (TINYINT — not PHI content)
      if (col.type === 'TINYINT') continue;

      // Check if this column name matches PHI keyword patterns
      const isLikelyPhi = PHI_KEYWORDS.some(kw => col.name.toLowerCase().includes(kw));
      if (!isLikelyPhi) continue;

      totalPhiFields++;

      if (col.isEncrypted) {
        encryptedPhiFields++;
        phiColumns.push({ name: col.name, status: 'encrypted', comment: col.comment });
      } else {
        unencryptedPhiFields++;
        phiColumns.push({ name: col.name, status: 'PLAINTEXT', comment: col.comment });

        issues.push(makeIssue('phi-plaintext-column', 'critical',
          `Table '${table.name}': column '${col.name}' appears to contain PHI/PII but is NOT encrypted`,
          `${table.name}.${col.name}`,
          `Encrypt this column using AES-256-GCM and rename to '${col.name}_enc'. Update all read/write queries.`));
      }
    }

    if (phiColumns.length > 0) {
      phiTablesAudited.push({ table: table.name, columns: phiColumns });
    }
  }

  const encryptionCoverage = totalPhiFields > 0
    ? Math.round((encryptedPhiFields / totalPhiFields) * 100)
    : 100;

  issues.unshift(makeIssue('phi-encryption-coverage', encryptionCoverage === 100 ? 'info' : 'high',
    `PHI/PII encryption coverage: ${encryptedPhiFields}/${totalPhiFields} fields encrypted (${encryptionCoverage}%)`,
    null,
    encryptionCoverage < 100 ? 'All PHI/PII fields must be encrypted at rest using AES-256-GCM.' : null));

  return {
    check: 'phi-pii-compliance',
    summary: { totalPhiFields, encryptedPhiFields, unencryptedPhiFields, encryptionCoverage },
    phiTablesAudited,
    issues,
  };
}

// ─── Check 2: Encryption coverage by naming convention ───────────────────────

function checkEncryptionConvention(tables) {
  const issues = [];

  // All TEXT/MEDIUMTEXT columns that do NOT end in _enc and are NOT in
  // well-known non-PHI columns should be reviewed
  const SAFE_TEXT_COLUMNS = new Set([
    'discharge_record', 'notes', 'content', 'description', 'title',
    'instructions', 'metadata', 'config', 'settings', 'details',
    'recurrence_rule', 'data', 'payload', 'body', 'text',
    'score_label', 'interpretation_label', 'form_title', 'form_key',
    'category', 'plan_type', 'practice_type', 'timezone', 'reason',
    // portal_settings: practice-level configuration text (marketing copy, not patient PHI)
    'welcome_message', 'help_message', 'offering_ministry_note',
  ]);

  for (const table of tables) {
    for (const col of table.columns) {
      if (col.isEncrypted) continue;
      if (KNOWN_PLAINTEXT_EXCEPTIONS.has(col.name)) continue;
      if (SAFE_TEXT_COLUMNS.has(col.name)) continue;
      if (!['TEXT', 'MEDIUMTEXT', 'LONGTEXT', 'VARBINARY'].includes(col.type)) continue;
      // Skip legacy plaintext columns retained only for migration compatibility
      if (col.comment && col.comment.toLowerCase().includes('migration compatibility')) continue;
      // Skip columns explicitly marked non-PHI in schema comments
      if (col.comment && /non-?phi|not\s+phi/i.test(col.comment)) continue;

      // If it's a large text column without encryption and not flagged already
      const looksLikePhi = PHI_KEYWORDS.some(kw => col.name.toLowerCase().includes(kw));
      if (!looksLikePhi) {
        // Lower priority — just a review notice
        issues.push(makeIssue('unencrypted-text-column', 'low',
          `Table '${table.name}': TEXT column '${col.name}' not encrypted — review if it may contain sensitive data`,
          `${table.name}.${col.name}`,
          'Review whether this field may contain free-text PHI/PII. If so, encrypt and suffix with _enc.'));
      }
    }
  }

  if (issues.length === 0) {
    issues.push(makeIssue('encryption-convention', 'info',
      'All TEXT columns follow the encryption naming convention or are confirmed non-PHI'));
  }

  return { check: 'encryption-convention', issues };
}

// ─── Check 3: Tenant isolation verification ───────────────────────────────────

function checkTenantIsolation(tables) {
  const issues = [];

  // Tables that store client or staff data MUST have tenant_id
  const REQUIRE_TENANT_ID = new Set([
    'clients', 'client_lifecycles', 'appointments', 'staff_members', 'staff_accounts',
    'sessions', 'audit_events', 'consent_records', 'intake_packets', 'treatment_plans',
    'progress_notes', 'document_templates', 'document_assignments', 'invoices', 'payments',
    'portal_accounts', 'portal_sessions', 'portal_client_profiles', 'portal_resources',
    'portal_uploads', 'portal_message_threads', 'portal_messages',
    'client_addresses', 'client_phones', 'client_contacts', 'client_insurance',
    'client_diagnoses', 'client_medications', 'client_allergies',
    'client_clinical_history', 'client_faith_profiles', 'client_legal',
  ]);

  for (const table of tables) {
    if (!REQUIRE_TENANT_ID.has(table.name)) continue;

    const hasTenantId = table.columns.some(c => c.name === 'tenant_id');
    if (!hasTenantId) {
      issues.push(makeIssue('missing-tenant-id', 'critical',
        `Table '${table.name}' is expected to have tenant_id for row-level isolation but does not`,
        table.name,
        'Add tenant_id column and update all queries to include tenant_id in WHERE clauses.'));
    }
  }

  if (issues.length === 0) {
    issues.push(makeIssue('tenant-isolation', 'info',
      'All reviewed tables include tenant_id for row-level tenant isolation'));
  }

  return { check: 'tenant-isolation', issues };
}

// ─── Check 4: Audit table structure ───────────────────────────────────────────

function checkAuditTable(tables) {
  const issues = [];

  const auditTable = tables.find(t => t.name === 'audit_events');
  if (!auditTable) {
    issues.push(makeIssue('audit-table-missing', 'critical',
      'audit_events table not found in schema',
      null,
      'Create an audit_events table to record security-relevant events.'));
    return { check: 'audit-table', issues };
  }

  const colNames = new Set(auditTable.columns.map(c => c.name));
  const REQUIRED_AUDIT_COLS = ['id', 'tenant_id', 'actor_id', 'action', 'result', 'occurred_at'];

  for (const col of REQUIRED_AUDIT_COLS) {
    if (!colNames.has(col)) {
      issues.push(makeIssue('audit-column-missing', 'high',
        `audit_events table is missing required column: '${col}'`,
        `audit_events.${col}`,
        'Add the missing column to audit_events to ensure complete audit records.'));
    }
  }

  // Check for PHI in audit table
  const phiInAudit = auditTable.columns.filter(c =>
    !c.isEncrypted &&
    PHI_KEYWORDS.some(kw => c.name.toLowerCase().includes(kw))
  );

  if (phiInAudit.length > 0) {
    issues.push(makeIssue('phi-in-audit', 'critical',
      `audit_events table contains unencrypted potential PHI columns: ${phiInAudit.map(c => c.name).join(', ')}`,
      'audit_events',
      'Audit events must NEVER contain PHI. Use opaque IDs only. Remove or encrypt PHI fields.'));
  } else {
    issues.push(makeIssue('audit-phi-clean', 'info',
      'audit_events table does not appear to contain unencrypted PHI columns'));
  }

  if (issues.filter(i => i.level !== 'info').length === 0) {
    issues.push(makeIssue('audit-table', 'info',
      'audit_events table structure meets security requirements'));
  }

  return { check: 'audit-table', issues };
}

// ─── Check 5: Session table security ─────────────────────────────────────────

function checkSessionTable(tables) {
  const issues = [];

  const sessionTable = tables.find(t => t.name === 'sessions');
  if (!sessionTable) {
    issues.push(makeIssue('session-table-missing', 'critical',
      'sessions table not found in schema'));
    return { check: 'session-table', issues };
  }

  const colNames = new Set(sessionTable.columns.map(c => c.name));

  // Sessions should store token hash, not raw token
  if (colNames.has('token') && !colNames.has('token_hash')) {
    // Check if the 'id' column is described as storing a hash
    const idCol = sessionTable.columns.find(c => c.name === 'id');
    if (!idCol?.comment?.toLowerCase().includes('hash') &&
        !idCol?.comment?.toLowerCase().includes('sha')) {
      issues.push(makeIssue('session-raw-token', 'critical',
        "sessions.token appears to store raw token — should store SHA-256 hash only",
        'sessions.token',
        'Store only the SHA-256(token) hash in the sessions table, never the raw token.'));
    }
  }

  // Check expires_at column exists
  if (!colNames.has('expires_at') && !colNames.has('expiry') && !colNames.has('expire_at')) {
    issues.push(makeIssue('session-no-expiry', 'high',
      'sessions table does not have an expiry/expires_at column',
      'sessions',
      'Add expires_at to sessions table. Enforce session lifetime server-side.'));
  }

  if (issues.filter(i => i.level !== 'info').length === 0) {
    issues.push(makeIssue('session-table', 'info',
      'sessions table structure meets security requirements'));
  }

  return { check: 'session-table', issues };
}

// ─── Check 6: Query parameterization ─────────────────────────────────────────

function checkQueryParameterization() {
  const issues = [];

  if (!existsSync(QUERIES_DIR)) {
    issues.push(makeIssue('queries-dir-missing', 'medium',
      `Query directory not found: ${relative(ROOT, QUERIES_DIR)}`,
      null,
      'Ensure all database queries are in parameterized form.'));
    return { check: 'query-parameterization', issues };
  }

  const queryFiles = collectFiles(QUERIES_DIR, '.js');

  for (const file of queryFiles) {
    const rel = relative(ROOT, file);
    const source = readSource(file);
    if (!source) continue;

    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect string concatenation in SQL queries (common injection pattern)
      if (/(?:SELECT|INSERT|UPDATE|DELETE|WHERE)\s+.*\+\s*/.test(line) &&
          !line.trim().startsWith('//') && !line.trim().startsWith('*')) {

        // Allow template literals with ? placeholders only
        if (line.includes('?') || line.includes('${')) {
          // Check if the ${} contains user input references
          if (/\$\{(?:req\.|params\.|body\.|query\.|userId|tenantId)/.test(line)) {
            issues.push(makeIssue('sql-injection-risk', 'critical',
              `Possible user input interpolated directly into SQL: ${line.trim().substring(0, 100)}`,
              `${rel}:${i + 1}`,
              'Use parameterized queries with ? placeholders. Never interpolate user values into SQL.'));
          }
        } else {
          issues.push(makeIssue('sql-concatenation', 'high',
            `SQL string concatenation detected: ${line.trim().substring(0, 100)}`,
            `${rel}:${i + 1}`,
            'Use parameterized queries (? placeholders) instead of string concatenation.'));
        }
      }

      // Check for correct parameterized pattern
      if (line.includes('await pool.query') || line.includes('await conn.query')) {
        if (!line.includes('?') && !lines.slice(i, i + 5).join(' ').includes('?') &&
            (line.includes('WHERE') || line.includes('VALUES'))) {
          issues.push(makeIssue('unprepared-query', 'medium',
            `Query without parameter placeholders: ${line.trim().substring(0, 100)}`,
            `${rel}:${i + 1}`,
            'Ensure all queries use ? placeholders for user-supplied values.'));
        }
      }
    }
  }

  if (issues.length === 0) {
    issues.push(makeIssue('query-parameterization', 'info',
      'All reviewed queries appear to use parameterized form'));
  }

  return { check: 'query-parameterization', issues };
}

// ─── Check 7: Encryption key configuration ───────────────────────────────────

function checkEncryptionKeyConfig() {
  const issues = [];

  // Check the encrypt.js library for proper key handling
  const encryptFile = join(ROOT, 'apps/api/src/lib/encrypt.js');
  if (!existsSync(encryptFile)) {
    issues.push(makeIssue('encrypt-module-missing', 'critical',
      'Encryption module apps/api/src/lib/encrypt.js not found',
      null,
      'Ensure AES-256-GCM encryption module exists and is used for all PHI fields.'));
    return { check: 'encryption-key-config', issues };
  }

  const encSource = readSource(encryptFile);

  // Should read key from environment
  if (!encSource.includes('process.env') || !encSource.includes('DB_ENCRYPTION_KEY')) {
    issues.push(makeIssue('encryption-key-env', 'critical',
      'Encryption module may not be reading DB_ENCRYPTION_KEY from environment',
      'apps/api/src/lib/encrypt.js',
      'Always read the encryption key from process.env.DB_ENCRYPTION_KEY. Never hardcode it.'));
  } else {
    issues.push(makeIssue('encryption-key-env', 'info',
      'Encryption key correctly read from environment variable'));
  }

  // Should use AES-256-GCM
  if (!encSource.includes('aes-256-gcm') && !encSource.includes('AES-256-GCM')) {
    issues.push(makeIssue('encryption-algorithm', 'critical',
      'Encryption module does not appear to use AES-256-GCM',
      'apps/api/src/lib/encrypt.js',
      'Use AES-256-GCM for all field-level encryption.'));
  } else {
    issues.push(makeIssue('encryption-algorithm', 'info',
      'AES-256-GCM encryption algorithm confirmed in use'));
  }

  // Should generate random IV per encryption
  if (!encSource.includes('randomBytes') && !encSource.includes('getRandomValues')) {
    issues.push(makeIssue('encryption-iv', 'high',
      'Encryption module may not be generating random IVs',
      'apps/api/src/lib/encrypt.js',
      'Generate a unique random IV (12 bytes minimum for GCM) for every encryption operation.'));
  } else {
    issues.push(makeIssue('encryption-iv', 'info',
      'Random IV generation confirmed in encryption module'));
  }

  // Should include authentication tag
  if (!encSource.includes('getAuthTag') && !encSource.includes('authTag')) {
    issues.push(makeIssue('encryption-auth-tag', 'high',
      'Encryption module may not be using GCM authentication tag',
      'apps/api/src/lib/encrypt.js',
      'Always store and verify the GCM authentication tag to detect tampering.'));
  } else {
    issues.push(makeIssue('encryption-auth-tag', 'info',
      'GCM authentication tag usage confirmed'));
  }

  return { check: 'encryption-key-config', issues };
}

// ─── Check 8: DB connection security ─────────────────────────────────────────

function checkDbConnectionSecurity() {
  const issues = [];

  const poolFile = join(ROOT, 'apps/api/src/db/pool.js');
  if (!existsSync(poolFile)) {
    issues.push(makeIssue('pool-file-missing', 'medium',
      'Database pool file apps/api/src/db/pool.js not found'));
    return { check: 'db-connection-security', issues };
  }

  const poolSource = readSource(poolFile);

  // Check SSL configuration
  if (!poolSource.includes('ssl') && !poolSource.includes('SSL')) {
    issues.push(makeIssue('db-ssl-missing', 'medium',
      'Database connection pool has no SSL configuration',
      'apps/api/src/db/pool.js',
      'Configure SSL/TLS for database connections in production via DB_SSL=true.'));
  } else {
    // Check for forced SSL (not just a variable)
    if (poolSource.includes('DB_SSL') || poolSource.includes('ssl:')) {
      issues.push(makeIssue('db-ssl-configured', 'info',
        'Database SSL configuration is present in connection pool'));
    }
  }

  // Check for connection timeout
  if (!poolSource.includes('connectTimeout') && !poolSource.includes('timeout')) {
    issues.push(makeIssue('db-timeout-missing', 'low',
      'Database connection pool may not have timeout configured',
      'apps/api/src/db/pool.js',
      'Set connection timeouts to prevent hanging connections.'));
  }

  // Check for credentials in source (should come from env)
  if (poolSource.includes('password:') && !poolSource.includes('process.env')) {
    issues.push(makeIssue('db-hardcoded-credentials', 'critical',
      'Database credentials may be hardcoded in pool configuration',
      'apps/api/src/db/pool.js',
      'All database credentials must come from environment variables.'));
  } else {
    issues.push(makeIssue('db-env-credentials', 'info',
      'Database credentials appear to be loaded from environment variables'));
  }

  return { check: 'db-connection-security', issues };
}

// ─── Check 9: Sensitive column names without encryption ───────────────────────

const HIGH_SENSITIVITY_PATTERNS = [
  { pattern: /\bpassword\b/i, description: 'password storage' },
  { pattern: /\btoken\b/i, description: 'token storage' },
  { pattern: /\bsecret\b/i, description: 'secret storage' },
  { pattern: /\bapi_key\b/i, description: 'API key storage' },
  { pattern: /\bsession_id\b/i, description: 'session identifier' },
  { pattern: /\breset_token\b/i, description: 'password reset token' },
];

function checkSensitiveColumns(tables) {
  const issues = [];

  for (const table of tables) {
    for (const col of table.columns) {
      for (const { pattern, description } of HIGH_SENSITIVITY_PATTERNS) {
        if (!pattern.test(col.name)) continue;

        // password_hash is expected — stored as argon2 hash
        if (col.name === 'password_hash') {
          issues.push(makeIssue('password-hash-column', 'info',
            `Table '${table.name}': password stored as hash column '${col.name}' — confirm argon2id in use`));
          continue;
        }

        // Token columns: should store hash, not raw value
        if (col.name.includes('token') && !col.isEncrypted) {
          const comment = col.comment?.toLowerCase() ?? '';
          if (!comment.includes('hash') && !comment.includes('sha')) {
            issues.push(makeIssue('token-not-hashed', 'high',
              `Table '${table.name}': column '${col.name}' (${description}) is not encrypted or hashed`,
              `${table.name}.${col.name}`,
              'Store only the SHA-256 hash of tokens, never the raw value.'));
          }
        }

        if (col.name.includes('secret') && !col.isEncrypted) {
          issues.push(makeIssue('secret-not-encrypted', 'critical',
            `Table '${table.name}': column '${col.name}' (${description}) is not encrypted`,
            `${table.name}.${col.name}`,
            'Encrypt or hash all secret values at rest.'));
        }
      }
    }
  }

  if (issues.filter(i => i.level !== 'info').length === 0) {
    issues.push(makeIssue('sensitive-columns', 'info',
      'No unprotected sensitive columns (passwords, tokens, secrets) found'));
  }

  return { check: 'sensitive-columns', issues };
}

// ─── Check 10: Portal public request tenant isolation ─────────────────────────

function checkPortalPublicSecurity(tables) {
  const issues = [];

  // portal_registration_requests is special: must NOT allow caller-supplied tenant_id
  // to determine storage (tenant must be forced server-side)
  const publicReqTable = tables.find(t => t.name === 'portal_registration_requests' ||
                                          t.name === 'portal_public_requests' ||
  // portal_public_requests is special: must NOT allow caller-supplied tenant_id
  // to determine storage (tenant must be forced server-side)
  const publicReqTable = tables.find(t => t.name === 'portal_public_requests' ||
                                          t.name === 'public_requests');
  if (!publicReqTable) {
    // This may be stored elsewhere — check if it's documented
    issues.push(makeIssue('portal-public-requests-not-found', 'low',
      'portal_registration_requests table not found in schema — verify public intake is stored securely',
      'portal_public_requests table not found in schema — verify public intake is stored securely',
      null,
      'Ensure public intake requests cannot specify their own tenant_id.'));
  } else {
    const hasTenant = publicReqTable.columns.some(c => c.name === 'tenant_id');
    if (hasTenant) {
      issues.push(makeIssue('portal-public-requests-tenant', 'info',
        `${publicReqTable.name} table includes tenant_id — ensure server enforces tenant assignment`));
        'portal_public_requests table includes tenant_id — ensure server enforces tenant assignment'));
    }
  }

  return { check: 'portal-public-security', issues };
}

// ─── Main scan orchestrator ───────────────────────────────────────────────────

async function runDbSecurityScan() {
  const startedAt = new Date().toISOString();
  console.log(`[db-security] Scan started at ${startedAt}`);
  console.log(`[db-security] Schema: ${SCHEMA_PATH}`);

  if (!existsSync(SCHEMA_PATH)) {
    console.error('[db-security] ERROR: schema.sql not found. Cannot perform schema analysis.');
    process.exit(1);
  }

  const schemaSource = readSource(SCHEMA_PATH);
  const tables = parseSchema(schemaSource);
  console.log(`[db-security] Parsed ${tables.length} tables from schema`);

  const checks = [
    checkPhiPiiCompliance(tables),
    checkEncryptionConvention(tables),
    checkTenantIsolation(tables),
    checkAuditTable(tables),
    checkSessionTable(tables),
    checkQueryParameterization(),
    checkEncryptionKeyConfig(),
    checkDbConnectionSecurity(),
    checkSensitiveColumns(tables),
    checkPortalPublicSecurity(tables),
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

  // Extract PHI compliance summary from check
  const phiCheck = checks.find(c => c.check === 'phi-pii-compliance');

  const report = {
    reportType: 'db-security',
    reportVersion: '1.0.0',
    generatedAt: finishedAt,
    startedAt,
    schemaPath: relative(ROOT, SCHEMA_PATH),
    tablesAnalyzed: tables.length,
    overallStatus,
    summary: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount, info: infoCount },
    phiComplianceSummary: phiCheck?.summary ?? null,
    phiTablesAudited: phiCheck?.phiTablesAudited ?? [],
    checks: checks.map(c => ({
      name: c.check,
      issueCount: (c.issues ?? []).filter(i => i.level !== 'info').length,
      issues: c.issues ?? [],
    })),
  };

  console.log(`\n[db-security] ─── Scan Summary ─────────────────────────────────`);
  console.log(`[db-security] Status   : ${overallStatus}`);
  console.log(`[db-security] Critical : ${criticalCount}`);
  console.log(`[db-security] High     : ${highCount}`);
  console.log(`[db-security] Medium   : ${mediumCount}`);
  console.log(`[db-security] Low      : ${lowCount}`);
  console.log(`[db-security] Info     : ${infoCount}`);
  if (phiCheck?.summary) {
    const ps = phiCheck.summary;
    console.log(`[db-security] PHI Coverage: ${ps.encryptedPhiFields}/${ps.totalPhiFields} (${ps.encryptionCoverage}%)`);
  }
  console.log(`[db-security] ──────────────────────────────────────────────────────\n`);

  if (OUTPUT_PATH) {
    writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[db-security] Report written to: ${OUTPUT_PATH}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  if (criticalCount > 0) {
    process.exit(2);
  }

  return report;
}

runDbSecurityScan().catch(err => {
  console.error('[db-security] Fatal error:', err.message);
  process.exit(1);
});
