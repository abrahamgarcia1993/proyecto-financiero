import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const userId = String(body.userId || '');
    const level = Number(body.level || 0);

    if (!userId || level < 1 || level > 5) {
      return NextResponse.json({ error: 'Datos invalidos.' }, { status: 400 });
    }

    const unlock = await prisma.userLevelUnlock.upsert({
      where: { userId_level: { userId, level } },
      update: {},
      create: { userId, level, unlockedBy: admin.id }
    });

    return NextResponse.json(unlock, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }
}
