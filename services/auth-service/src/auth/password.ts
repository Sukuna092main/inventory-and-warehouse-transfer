import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// OWASP scrypt baseline; explicit maxmem allows the 128 MiB work factor.
const SCRYPT_OPTIONS = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
const KEY_LENGTH = 64;
const HASH_PATTERN = /^scrypt\$131072\$8\$1\$([0-9a-f]{32})\$([0-9a-f]{128})$/;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const length = Array.from(password).length; // Count Unicode code points.
  if (length < 8 || length > 128 || password.trim().length === 0) {
    throw new Error(
      'Mật khẩu phải có từ 8 đến 128 ký tự, không chỉ chứa khoảng trắng.',
    );
  }
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$131072$8$1$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (password.length === 0 || Array.from(password).length > 128) return false;
  const parts = HASH_PATTERN.exec(hash);
  if (!parts) return false;
  const key = await deriveKey(password, Buffer.from(parts[1], 'hex'));
  return timingSafeEqual(key, Buffer.from(parts[2], 'hex'));
}
