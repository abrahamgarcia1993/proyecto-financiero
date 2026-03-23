import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, hashPassword, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { changePasswordSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const input = changePasswordSchema.parse(body);

    const validCurrentPassword = await comparePassword(input.currentPassword, user.passwordHash);
    if (!validCurrentPassword) {
      return NextResponse.json({ error: 'La contrasena actual no es correcta.' }, { status: 400 });
    }

    const newHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false
      }
    });

    return NextResponse.json({ ok: true, message: 'Contrasena actualizada correctamente.' });
  } catch {
    return NextResponse.json({ error: 'No autorizado o datos invalidos.' }, { status: 401 });
  }
}
