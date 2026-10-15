import { randomInt, timingSafeEqual } from 'crypto';
import { prisma } from './prisma';
import { authenticateToken } from './auth';

export async function requireAdmin(authHeader: string | null): Promise<string | null> {
  const userId = await authenticateToken(authHeader);
  if (!userId) return null;
  const user = await prisma.user.findFirst({ where: { id: userId, isAdmin: true } });
  return user ? userId : null;
}

export function generateKey(): string {
  // Alphanumeric without ambiguous chars (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join('');
}

/**
 * Checks the SEED_KEY sent in the `x-setup-key` header. It travels in a header, not the query
 * string, so it doesn't end up in access logs or browser history.
 */
export function hasValidSetupKey(request: Request): boolean {
  const expected = process.env.SEED_KEY;
  const given = request.headers.get('x-setup-key');
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
