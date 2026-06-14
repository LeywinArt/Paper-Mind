import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cohere-enterprise-qa-secret-key-change-me';

/**
 * Hashes a plain text password using PBKDF2.
 * Output format is salt:hash
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

interface UserPayload {
  userId: string;
  email: string;
}

/**
 * Generates a JSON Web Token for the user.
 */
export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a JSON Web Token and returns the payload if valid.
 */
export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Helper to check authentication from Astro cookies object.
 */
export function getUserFromCookies(cookies: any): UserPayload | null {
  const token = cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
