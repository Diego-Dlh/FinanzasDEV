import { NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';

// Only available outside production — lets visitors explore the app without a DB.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 403 });
  }

  const demoUserId = 'demo-user-id';
  const token = createToken({ userId: demoUserId });

  return NextResponse.json({
    token,
    user: {
      id: demoUserId,
      name: 'Diego Demo',
      email: 'demo@luminafi.com',
      isAdmin: true,
    },
  });
}
