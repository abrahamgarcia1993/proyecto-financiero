import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { generateTemporaryPassword, hashPassword } from '@/lib/auth';
import { sendApprovedCredentialsEmail } from '@/lib/mail';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    // Self-heal: if there are approved requests without user account, create them now.
    const approvedRequests = await prisma.accessRequest.findMany({
      where: { status: 'approved' },
      select: { name: true, email: true }
    });

    for (const approved of approvedRequests) {
      const existing = await prisma.user.findUnique({ where: { email: approved.email } });
      if (existing) {
        continue;
      }

      const tempPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(tempPassword);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      await prisma.user.create({
        data: {
          name: approved.name,
          email: approved.email,
          passwordHash,
          role: 'user',
          mustChangePassword: true,
          accountExpiresAt: nextYear
        }
      });

      try {
        await sendApprovedCredentialsEmail({ to: approved.email, tempPassword });
      } catch {
        // Do not block admin panel if email delivery fails.
      }
    }

    const [activeUsers, deletedUsers] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'user', deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          accountExpiresAt: true,
          mustChangePassword: true,
          deletedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({
        where: { role: 'user', deletedAt: { not: null } },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          accountExpiresAt: true,
          mustChangePassword: true,
          deletedAt: true
        },
        orderBy: { deletedAt: 'desc' }
      })
    ]);

    return NextResponse.json({ activeUsers, deletedUsers });
  } catch {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const userId = String(body.userId || '');
    if (!userId) {
      return NextResponse.json({ error: 'Falta el identificador del usuario.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing || existing.role !== 'user') {
      return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ ok: true, message: 'Cuenta eliminada correctamente.' });
  } catch {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }
}
