import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

export function createToken(payload: { userId: string }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret());
}

export function authenticateToken(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = verifyToken(token) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}
