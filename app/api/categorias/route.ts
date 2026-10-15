import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { api } from '@/lib/http';

// GET /api/categorias           → categories a user can pick (system ones excluded)
// GET /api/categorias?all=1     → including system categories (for filtering history)
async function handleGet(request: Request) {
  const authHeader = request.headers.get('authorization');
  const userId = await authenticateToken(authHeader);
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const includeSystem = new URL(request.url).searchParams.get('all') === '1';

  try {
    const categories = await prisma.category.findMany({
      where: includeSystem ? undefined : { isSystem: false },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}

// Categories are global: only admins create them, via POST /api/admin/categorias.

export const GET = api(handleGet);
