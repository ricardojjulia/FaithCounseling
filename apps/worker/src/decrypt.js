import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

let _key = null;
function key() {
  if (_key) return _key;
  const hex = process.env.DB_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('DB_ENCRYPTION_KEY must be a 64-character hex string. Generate with: openssl rand -hex 32');
  }
  _key = Buffer.from(hex, 'hex');
  return _key;
}

export function decrypt(stored) {
  if (stored == null) return null;
  if (Buffer.isBuffer(stored)) stored = stored.toString('utf8');
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted field format');
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return decipher.update(Buffer.from(ctB64, 'base64')) + decipher.final('utf8');
}
