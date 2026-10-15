import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { api, parseBody } from '@/lib/http';

async function handlePost(request: Request) {
  const { email, password } = await parseBody(request, loginSchema);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = createToken({ userId: user.id, tokenVersion: user.tokenVersion });
  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
}

export const POST = api(handlePost);
