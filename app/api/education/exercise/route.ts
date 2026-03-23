import dayjs from 'dayjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    const start = dayjs().startOf('month').toDate();
    const end = dayjs().endOf('month').toDate();

    const expenses = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'expense',
        date: { gte: start, lte: end }
      }
    });

    const total = expenses.reduce((acc, item) => acc + item.amount, 0);
    const byCategory = expenses.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    return NextResponse.json({
      theory:
        'Mini-clase del mes: presupuestar no es prohibirte vivir, es decidir con intención. Primero identifica qué categorías concentran mayor gasto; después prioriza ajustes donde el impacto sea alto y el esfuerzo sostenible. La mejora real llega con cambios pequeños, medibles y repetidos mes a mes.',
      example:
        'Si una categoría concentra demasiado gasto, reducirla de forma gradual puede liberar dinero sin afectar tu bienestar esencial. Ese importe liberado debe tener destino definido: ahorro, deuda o una meta prioritaria.',
      exercise: topCategory
        ? `Tu categoría principal es ${topCategory[0]} con ${topCategory[1].toFixed(2)} EUR. Diseña una acción concreta para reducir al menos un 10% el próximo mes, define la cifra objetivo y asigna ese importe automáticamente a una meta.`
        : 'Agrega al menos 3 gastos este mes para recibir una recomendación personalizada basada en tus hábitos reales.',
      monthlyExpense: total
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

