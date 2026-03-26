import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { PersistedConfig } from '../types/config.types.js';

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateRandomPassword(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  }
  return password;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  passwords: PersistedConfig['passwords']
): Promise<boolean> {
  if (passwords.random) {
    const match = await bcrypt.compare(plain, passwords.random.hash);
    if (match) return true;
  }
  if (passwords.fixed) {
    const match = await bcrypt.compare(plain, passwords.fixed.hash);
    if (match) return true;
  }
  return false;
}
