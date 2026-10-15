import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { HttpError } from './http';

const MIN_JWT_SECRET_LENGTH = 32;

// Placeholders that appear in the repo's example env files and compose files
function isPlaceholderSecret(secret: string) {
  const s = secret.toLowerCase();
  return s.includes('change_me') || s.includes('change_this') || s === 'super_secure_change_me';
}

// Fail loudly in production if the secret is missing, short, or an example value
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH || isPlaceholderSecret(secret)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `JWT_SECRET is missing, shorter than ${MIN_JWT_SECRET_LENGTH} chars, or an example placeholder. ` +
        'Generate one with: openssl rand -base64 48',
      );
    }
    return 'dev_only_secret_change_in_production';
  }
  return secret;
}

// Called at server startup (instrumentation.ts) so a bad secret stops the
// container instead of surfacing later as failed logins.
export function assertJwtSecretConfigured() {
  getJwtSecret();
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

// User created by /api/demo-login (development only). It has no database row,
// so its tokens skip the user lookup below.
export const DEMO_USER_ID = 'demo-user-id';

/** `tokenVersion` (claim `tv`) ties the token to the user's current version. */
export function createToken(payload: { userId: string; tokenVersion?: number }) {
  const { userId, tokenVersion = 0 } = payload;
  return jwt.sign({ userId, tv: tokenVersion }, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret());
}

/**
 * Returns the user id for a valid token, or null. Beyond the signature it checks
 * that the user still exists and that the token wasn't issued before a password
 * change (tokenVersion). Tokens without the `tv` claim count as version 0, so
 * sessions opened before this check keep working until the password changes.
 * Throws 503 when the database can't be reached (an outage is not a logout).
 */
export async function authenticateToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');

  let payload: { userId?: string; tv?: number };
  try {
    payload = verifyToken(token) as { userId?: string; tv?: number };
  } catch {
    return null;
  }
  if (!payload.userId) return null;
  if (payload.userId === DEMO_USER_ID) return payload.userId;

  let user: { tokenVersion: number } | null;
  try {
    user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { tokenVersion: true } });
  } catch (error) {
    console.error('[auth] user lookup failed', error);
    throw new HttpError(503, 'Servicio no disponible. Intenta de nuevo en unos minutos.');
  }
  if (!user || user.tokenVersion !== (payload.tv ?? 0)) return null;
  return payload.userId;
}
