import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Fail loudly in production if the secret is not set or is the example value
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change_this_secret' || secret === 'super_secure_change_me') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET env var is missing or uses the default placeholder. Set a strong secret.');
    }
    return 'dev_only_secret_change_in_production';
  }
  return secret;
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
