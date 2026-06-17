import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const body = await request.json();
  const parse = registerSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parse.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'El correo ya está registrado' }, { status: 409 });
  }

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      settings: { create: { darkMode: false, notifications: true } },
      accounts: {
        create: [
          { name: 'Cuenta Principal', type: 'BANK', balance: 0, currency: 'COP' },
          { name: 'Efectivo',          type: 'CASH', balance: 0, currency: 'COP' },
          { name: 'Ahorro',            type: 'BANK', balance: 0, currency: 'COP' },
        ],
      },
      alerts: {
        create: {
          message: `¡Bienvenido a Lumina Finance, ${name.split(' ')[0]}! Comienza registrando tus ingresos.`,
          type: 'SPENDING_ALERT',
        },
      },
    },
  });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
}
