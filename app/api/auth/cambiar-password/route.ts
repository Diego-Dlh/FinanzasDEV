import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken, verifyPassword, hashPassword, createToken } from '@/lib/auth';
import { changePasswordApiSchema } from '@/lib/validators';
import { api, parseBody } from '@/lib/http';

async function handlePut(request: Request) {
  const userId = await authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { currentPassword, newPassword } = await parseBody(request, changePasswordApiSchema);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 });

  // Bumping tokenVersion signs out every other session (a stolen token stops working);
  // this device gets a fresh token so it stays signed in.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
  });

  return NextResponse.json({
    ok: true,
    message: 'Contraseña actualizada correctamente',
    token: createToken({ userId, tokenVersion: updated.tokenVersion }),
  });
}

export const PUT = api(handlePut);
