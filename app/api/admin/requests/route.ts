import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTemporaryPassword, hashPassword, requireAdmin } from '@/lib/auth';
import { sendApprovedCredentialsEmail } from '@/lib/mail';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const requests = await prisma.accessRequest.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const requestId = String(body.requestId || '');
    const status = body.status as 'approved' | 'rejected';
    if (!requestId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Datos invalidos.' }, { status: 400 });
    }

    const updated = await prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedById: admin.id,
        reviewedAt: new Date(),
        inviteToken: null,
        inviteExpires: null
      }
    });

    if (status === 'approved') {
      const tempPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(tempPassword);
      const existingUser = await prisma.user.findUnique({ where: { email: updated.email } });
      const now = new Date();
      const nextYear = new Date(now);
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      if (existingUser) {
        const baseDate =
          existingUser.accountExpiresAt && existingUser.accountExpiresAt > now
            ? existingUser.accountExpiresAt
            : now;
        const extendedDate = new Date(baseDate);
        extendedDate.setFullYear(extendedDate.getFullYear() + 1);

        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            mustChangePassword: true,
            accountExpiresAt: extendedDate
          }
        });
      } else {
        await prisma.user.create({
          data: {
            name: updated.name,
            email: updated.email,
            passwordHash,
            role: 'user',
            mustChangePassword: true,
            accountExpiresAt: nextYear
          }
        });
      }

      await sendApprovedCredentialsEmail({ to: updated.email, tempPassword });
    }

    return NextResponse.json({ ...updated, tempPasswordSent: status === 'approved' });
  } catch {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }
}
