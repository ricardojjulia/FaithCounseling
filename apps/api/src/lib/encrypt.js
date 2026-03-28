/**
 * Field-level AES-256-GCM encryption for PHI columns.
 *
 * A fresh 96-bit IV is generated per call so identical plaintexts produce
 * different ciphertexts (semantic security).  The GCM auth tag ensures
 * tampering is detected on decryption.
 *
 * Stored format (base64 segments joined by ":"):
 *   <iv_b64>:<tag_b64>:<ciphertext_b64>
 *
 * Environment variable:
 *   DB_ENCRYPTION_KEY — 64 hex characters (32 bytes).
 *   Generate with:  openssl rand -hex 32
 *
 * Key rotation: decrypt with the old key, re-encrypt with the new key
 * using a one-off migration script.  The current key is always DB_ENCRYPTION_KEY.
 */

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

function loadKey() {
  const hex = process.env.DB_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'DB_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate with: openssl rand -hex 32',
    );
  }
  return Buffer.from(hex, 'hex');
}

// Lazy-load so the key is only required when encrypt/decrypt is actually called.
let _key = null;
function key() {
  if (!_key) _key = loadKey();
  return _key;
}

/**
 * Encrypt a plaintext string.  Returns null if plaintext is null/undefined.
 * @param {string|null|undefined} plaintext
 * @returns {string|null}  Base64 encoded "iv:tag:ciphertext"
 */
export function encrypt(plaintext) {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(12);                               // 96-bit IV
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();                                 // 128-bit GCM tag
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a value produced by encrypt().  Returns null if stored is null.
 * Throws if the ciphertext has been tampered with (GCM tag mismatch).
 * @param {string|null|undefined} stored
 * @returns {string|null}
 */
export function decrypt(stored) {
  if (stored == null) return null;
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted field format');
  const [ivB64, tagB64, ctB64] = parts;
  const iv  = Buffer.from(ivB64,  'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct  = Buffer.from(ctB64,  'base64');
  const decipher = crypto.createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(ct) + decipher.final('utf8');
}

/**
 * Encrypt a JSON-serialisable value (object / array).
 * Returns null if value is null/undefined.
 */
export function encryptJson(value) {
  if (value == null) return null;
  return encrypt(JSON.stringify(value));
}

/**
 * Decrypt and JSON-parse a value produced by encryptJson().
 * Returns null if stored is null.
 */
export function decryptJson(stored) {
  const raw = decrypt(stored);
  if (raw == null) return null;
  return JSON.parse(raw);
}

function normalizeLookupInput(value, { lowercase = false } = {}) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return lowercase ? trimmed.toLowerCase() : trimmed;
}

/**
 * Derive a deterministic HMAC-SHA256 lookup hash for sensitive identifiers that
 * still need equality matching, such as login emails.
 */
export function deriveLookupHash(value, options = {}) {
  const normalized = normalizeLookupInput(value, options);
  if (!normalized) return null;
  return crypto.createHmac('sha256', key()).update(normalized, 'utf8').digest('hex');
}
