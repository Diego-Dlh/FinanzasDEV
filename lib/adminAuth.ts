import { prisma } from './prisma';
import { authenticateToken } from './auth';

export async function requireAdmin(authHeader: string | null): Promise<string | null> {
  const userId = authenticateToken(authHeader);
  if (!userId) return null;
  const user = await prisma.user.findFirst({ where: { id: userId, isAdmin: true } });
  return user ? userId : null;
}

export function generateKey(): string {
  // Alphanumeric without ambiguous chars (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
