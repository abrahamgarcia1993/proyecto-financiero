import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const userId = String(body.userId || '');
    const months = Number(body.months || 12);

    if (!userId || !Number.isFinite(months) || months <= 0 || months > 60) {
      return NextResponse.json({ error: 'Datos invalidos.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'user') {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const now = new Date();
    const baseDate = user.accountExpiresAt && user.accountExpiresAt > now ? user.accountExpiresAt : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { accountExpiresAt: newExpiry },
      select: { id: true, name: true, email: true, accountExpiresAt: true }
    });

    return NextResponse.json({ message: 'Cuenta ampliada correctamente.', user: updated });
  } catch {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }
}
