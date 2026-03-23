import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const lessonId = String(body.lessonId || '');

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId es obligatorio.' }, { status: 400 });
    }

    await prisma.userProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      update: { completed: true, completedAt: new Date() },
      create: { userId: user.id, lessonId, completed: true, completedAt: new Date() }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}
