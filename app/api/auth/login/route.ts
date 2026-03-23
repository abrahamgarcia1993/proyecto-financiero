import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validators';
import { comparePassword, normalizeRole, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: 'Credenciales invalidas.' }, { status: 401 });
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales invalidas.' }, { status: 401 });
    }

    if (user.deletedAt) {
      return NextResponse.json(
        { error: 'Tu cuenta ha sido eliminada por el administrador.' },
        { status: 403 }
      );
    }

    if (user.role === 'user' && user.accountExpiresAt && user.accountExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Tu cuenta ha caducado. Contacta con el administrador para ampliarla.' },
        { status: 403 }
      );
    }

    const token = signToken({ userId: user.id, role: normalizeRole(user.role), email: user.email });
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        accountExpiresAt: user.accountExpiresAt
      }
    });
  } catch {
    return NextResponse.json({ error: 'Datos de inicio de sesion invalidos.' }, { status: 400 });
  }
}
