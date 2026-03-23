import dayjs from 'dayjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { transactionSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const month = Number(request.nextUrl.searchParams.get('month') || dayjs().month() + 1);
    const year = Number(request.nextUrl.searchParams.get('year') || dayjs().year());

    const start = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const end = dayjs(start).endOf('month').toDate();

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: start, lte: end } },
      orderBy: { date: 'desc' }
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, item) => acc + item.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, item) => acc + item.amount, 0);

    return NextResponse.json({
      month,
      year,
      transactions,
      total_income: totalIncome,
      total_expense: totalExpense,
      savings: totalIncome - totalExpense
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const input = transactionSchema.parse(body);

    const parsedDate = new Date(input.date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Fecha de movimiento invalida.' }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: input.type,
        amount: input.amount,
        category: input.category ? input.category.toLowerCase() : 'sin-categoria',
        date: parsedDate,
        description: input.description ? input.description.trim() : null
      }
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Datos de movimiento invalidos.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const transactionId = String(body.transactionId || '');

    if (!transactionId) {
      return NextResponse.json({ error: 'Falta el identificador del movimiento.' }, { status: 400 });
    }

    const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Movimiento no encontrado.' }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id: transactionId } });
    return NextResponse.json({ ok: true, message: 'Movimiento eliminado correctamente.' });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'No se pudo eliminar el movimiento.' }, { status: 400 });
  }
}
