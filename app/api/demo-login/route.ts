import { NextResponse } from 'next/server';
import { createToken, DEMO_USER_ID } from '@/lib/auth';
import { api } from '@/lib/http';

// Only available outside production — lets visitors explore the app without a DB.
async function handleGet() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 403 });
  }

  const token = createToken({ userId: DEMO_USER_ID });

  return NextResponse.json({
    token,
    user: {
      id: DEMO_USER_ID,
      name: 'Diego Demo',
      email: 'demo@luminafi.com',
      isAdmin: true,
    },
  });
}

export const GET = api(handleGet);
