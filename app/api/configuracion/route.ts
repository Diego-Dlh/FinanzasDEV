import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { api, parseBody } from '@/lib/http';

const DEFAULT_SETTING = { darkMode: false, notifications: true };

const settingUpdateSchema = z.object({
  darkMode: z.boolean({ error: 'darkMode debe ser verdadero o falso' }),
  notifications: z.boolean({ error: 'notifications debe ser verdadero o falso' }),
}).partial();

async function handleGet(request: Request) {
  const userId = await authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const setting = await prisma.setting.upsert({
      where: { userId },
      create: { userId, ...DEFAULT_SETTING },
      update: {},
    });
    return NextResponse.json({ setting });
  } catch {
    // The theme preference is cosmetic: fall back to the default rather than failing the page
    return NextResponse.json({ setting: DEFAULT_SETTING });
  }
}

async function handlePut(request: Request) {
  const userId = await authenticateToken(request.headers.get('authorization'));
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const data = await parseBody(request, settingUpdateSchema);
  const setting = await prisma.setting.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_SETTING, ...data },
    update: data,
  });

  return NextResponse.json({ setting });
}

export const GET = api(handleGet);
export const PUT = api(handlePut);
