import crypto from 'crypto';
import type { UserRole } from './types.ts';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * Hashes a plaintext password securely using scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against the stored scrypt hash
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Validates password complexity according to TaskHub rules
 * All portals: min 8 chars, 1 uppercase, 1 numeric digit, 1 special symbol
 * Admin: min 10 chars, 1 uppercase, 1 numeric digit, 1 special symbol
 */
export function validatePasswordStrength(
  password: string,
  isAdmin = false
): { valid: boolean; error?: string } {
  const minLength = isAdmin ? 10 : 8;
  if (!password || password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters in length.`,
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!hasDigit) {
    return { valid: false, error: 'Password must contain at least one numeric digit.' };
  }
  if (!hasSpecial) {
    return { valid: false, error: 'Password must contain at least one special symbol.' };
  }

  return { valid: true };
}

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
