import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const body = await request.json();
  const parse = loginSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { email, password } = parse.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = createToken({ userId: user.id });
  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
}
