import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken, verifyPassword, hashPassword } from '@/lib/auth';

export async function PUT(request: Request) {
  const userId = authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 });

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return NextResponse.json({ ok: true, message: 'Contraseña actualizada correctamente' });
}
