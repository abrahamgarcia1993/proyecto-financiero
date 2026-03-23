import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { accessRequestSchema } from '@/lib/validators';
import { sendAccessRequestNotification } from '@/lib/mail';

function normalizeFinancialLevel(level: string) {
  const normalized = level.toLowerCase();
  if (normalized === 'beginner') return 'principiante';
  if (normalized === 'intermediate') return 'intermedio';
  if (normalized === 'advanced') return 'avanzado';
  return normalized;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = accessRequestSchema.parse(body);

    const existing = await prisma.accessRequest.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una solicitud de acceso para este correo.' }, { status: 409 });
    }

    const data = await prisma.accessRequest.create({
      data: {
        ...input,
        occupation: '',
        email: input.email.toLowerCase(),
        financialLevel: normalizeFinancialLevel(input.financialLevel)
      }
    });

    let notificationSent = true;
    try {
      await sendAccessRequestNotification({
        name: data.name,
        email: data.email,
        reason: data.reason,
        financialLevel: data.financialLevel
      });
    } catch (notificationError) {
      notificationSent = false;
      console.error('No se pudo enviar notificacion al correo del admin:', notificationError);
    }

    return NextResponse.json(
      {
        id: data.id,
        status: data.status,
        notificationSent,
        warning: notificationSent ? undefined : 'Solicitud guardada, pero no se pudo enviar el correo al admin.'
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const field = issue?.path?.[0];

      if (field === 'name') {
        return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres.' }, { status: 400 });
      }

      if (field === 'email') {
        return NextResponse.json({ error: 'El correo electronico no es valido.' }, { status: 400 });
      }

      if (field === 'reason') {
        return NextResponse.json({ error: 'El motivo debe tener al menos 10 caracteres.' }, { status: 400 });
      }

      if (field === 'financialLevel') {
        return NextResponse.json({ error: 'Selecciona un nivel financiero valido.' }, { status: 400 });
      }

      return NextResponse.json({ error: 'Revisa los datos del formulario.' }, { status: 400 });
    }

    const message = String((error as Error)?.message || '');
    if (message.includes('Error validating datasource') || message.includes('PrismaClientInitializationError')) {
      console.error('Error de base de datos en /auth/request-access:', error);
      return NextResponse.json(
        { error: 'Error de configuracion de base de datos. Revisa DATABASE_URL en el servidor.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Datos de solicitud invalidos.' }, { status: 400 });
  }
}
