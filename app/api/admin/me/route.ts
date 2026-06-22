import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const adminId = await requireAdmin(request.headers.get('authorization'));
  if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  return NextResponse.json({ isAdmin: true, userId: adminId });
}
