import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validators';
import { hashPassword, normalizeRole, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = registerSchema.parse(body);

    const approvedRequest = await prisma.accessRequest.findFirst({
      where: {
        inviteToken: input.token,
        status: 'approved',
        inviteExpires: { gte: new Date() }
      }
    });

    if (!approvedRequest) {
      return NextResponse.json({ error: 'Token de invitacion invalido o caducado.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: approvedRequest.email } });
    if (existingUser) {
      return NextResponse.json({ error: 'El usuario ya esta activado.' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: approvedRequest.name,
        email: approvedRequest.email,
        passwordHash: await hashPassword(input.password)
      }
    });

    await prisma.accessRequest.update({
      where: { id: approvedRequest.id },
      data: { inviteToken: randomUUID(), inviteExpires: new Date() }
    });

    const token = signToken({ userId: user.id, role: normalizeRole(user.role), email: user.email });
    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch {
    return NextResponse.json({ error: 'Datos de registro invalidos.' }, { status: 400 });
  }
}
