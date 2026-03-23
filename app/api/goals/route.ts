import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { goalSchema } from '@/lib/validators';

function parseMonthlySpendingGoalCategory(title: string) {
  const match = title.match(/^limite de gasto en (.+) \(mensual\)$/i);
  if (!match) return null;
  return match[1].trim().toLowerCase();
}

function parseSavingsAllocationGoal(title: string) {
  const match = title.match(/^meta ahorro\|(.+)\|([0-9]+(?:[.,][0-9]+)?)\|(.+)$/i);
  if (!match) return null;

  const name = match[1].trim();
  const percentage = Number(match[2].replace(',', '.'));
  const temporality = match[3].trim().toLowerCase();

  if (!name || !Number.isFinite(percentage) || percentage <= 0) {
    return null;
  }

  return { name, percentage, temporality };
}

function resolveTemporalityDeadline(temporality: string, exactDate?: string) {
  const base = dayjs();
  if (temporality === 'fecha exacta') {
    if (!exactDate) return null;
    const parsed = dayjs(exactDate);
    if (!parsed.isValid()) return null;
    return parsed.endOf('day').toDate();
  }
  if (temporality === 'mensual') return base.add(1, 'month').endOf('month').toDate();
  if (temporality === 'trimestral') return base.add(3, 'month').endOf('month').toDate();
  if (temporality === 'semestral') return base.add(6, 'month').endOf('month').toDate();
  if (temporality === 'anual') return base.add(12, 'month').endOf('month').toDate();
  return base.add(10, 'year').endOf('month').toDate();
}

function parsePeriod(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function buildGoalsWithProgressForPeriod(userId: string, goals: Array<{
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  createdAt: Date;
}>, month: number, year: number) {
  const monthlySpendingCategories = new Set<string>();
  const savingsAllocationGoals = new Set<string>();
  for (const goal of goals) {
    const category = parseMonthlySpendingGoalCategory(goal.title);
    if (category) {
      monthlySpendingCategories.add(category);
    }

    const savingsAllocation = parseSavingsAllocationGoal(goal.title);
    if (savingsAllocation) {
      savingsAllocationGoals.add(goal.id);
    }
  }

  const monthStart = dayjs(`${year}-${month}-01`).startOf('month').toDate();
  const monthEnd = dayjs(`${year}-${month}-01`).endOf('month').toDate();

  const monthlySpendingTransactions = monthlySpendingCategories.size
    ? await prisma.transaction.findMany({
        where: {
          userId,
          type: 'expense',
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        select: { category: true, amount: true }
      })
    : [];

  const periodTransactions = savingsAllocationGoals.size
    ? await prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        select: { type: true, amount: true }
      })
    : [];

  const monthlySpendingTotals: Record<string, number> = {};
  for (const item of monthlySpendingTransactions) {
    const category = item.category.toLowerCase();
    monthlySpendingTotals[category] = (monthlySpendingTotals[category] || 0) + item.amount;
  }

  const monthlyIncome = periodTransactions
    .filter((item) => item.type === 'income')
    .reduce((acc, item) => acc + item.amount, 0);

  const monthlyExpense = periodTransactions
    .filter((item) => item.type === 'expense')
    .reduce((acc, item) => acc + item.amount, 0);

  const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);

  return goals.map((goal) => {
    const category = parseMonthlySpendingGoalCategory(goal.title);
    if (category) {
      return {
        ...goal,
        currentAmount: monthlySpendingTotals[category] || 0
      };
    }

    const savingsAllocation = parseSavingsAllocationGoal(goal.title);
    if (savingsAllocation) {
      return {
        ...goal,
        currentAmount: Number(((monthlySavings * savingsAllocation.percentage) / 100).toFixed(2))
      };
    }

    return goal;
  });
}

async function ensureMonthlySnapshot(userId: string, goals: Array<{
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  createdAt: Date;
}>, month: number, year: number) {
  const existing = await prisma.goalMonthlySnapshot.findFirst({
    where: { userId, month, year }
  });

  if (existing || goals.length === 0) {
    return;
  }

  const goalsWithProgress = await buildGoalsWithProgressForPeriod(userId, goals, month, year);

  await prisma.goalMonthlySnapshot.createMany({
    data: goalsWithProgress.map((goal) => ({
      userId,
      month,
      year,
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      achieved: goal.currentAmount <= goal.targetAmount
    }))
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const requestedMonth = parsePeriod(request.nextUrl.searchParams.get('month'), dayjs().month() + 1);
    const requestedYear = parsePeriod(request.nextUrl.searchParams.get('year'), dayjs().year());

    const safeMonth = Math.min(12, Math.max(1, requestedMonth));
    const safeYear = Math.min(2100, Math.max(2020, requestedYear));

    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { deadline: 'asc' }
    });

    const previousMonthRef = dayjs().subtract(1, 'month');
    await ensureMonthlySnapshot(user.id, goals, previousMonthRef.month() + 1, previousMonthRef.year());

    const goalsWithProgress = await buildGoalsWithProgressForPeriod(user.id, goals, safeMonth, safeYear);

    const history = await prisma.goalMonthlySnapshot.findMany({
      where: { userId: user.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { title: 'asc' }],
      take: 240
    });

    return NextResponse.json({
      period: { month: safeMonth, year: safeYear },
      goals: goalsWithProgress,
      history
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();

    if (String(body.kind || '') === 'savings-allocation') {
      const name = String(body.name || '').trim();
      const rawPercentage = body.percentage;
      const rawTargetAmount = body.targetAmount;
      const percentage = typeof rawPercentage === 'string'
        ? Number(rawPercentage.replace(',', '.'))
        : Number(rawPercentage);
      const targetAmount = typeof rawTargetAmount === 'string'
        ? Number(rawTargetAmount.replace(',', '.'))
        : Number(rawTargetAmount);
      const temporality = String(body.temporality || '').trim().toLowerCase();
      const exactDate = body.exactDate ? String(body.exactDate) : '';

      const allowedTemporalities = ['mensual', 'trimestral', 'semestral', 'anual', 'sin fecha', 'fecha exacta'];

      if (
        !name ||
        !Number.isFinite(percentage) ||
        percentage <= 0 ||
        percentage > 100 ||
        !Number.isFinite(targetAmount) ||
        targetAmount <= 0 ||
        !allowedTemporalities.includes(temporality)
      ) {
        return NextResponse.json({ error: 'Datos de meta de ahorro invalidos.' }, { status: 400 });
      }

      const deadline = resolveTemporalityDeadline(temporality, exactDate);
      if (!deadline) {
        return NextResponse.json({ error: 'Introduce una fecha exacta valida para esta meta.' }, { status: 400 });
      }

      const userGoals = await prisma.goal.findMany({ where: { userId: user.id }, select: { title: true } });
      const allocated = userGoals.reduce((acc, goal) => {
        const parsed = parseSavingsAllocationGoal(goal.title);
        return acc + (parsed?.percentage || 0);
      }, 0);

      if (allocated + percentage > 100) {
        return NextResponse.json(
          { error: `La suma de porcentajes de ahorro no puede superar 100%. Actualmente tienes ${allocated.toFixed(2)}%.` },
          { status: 400 }
        );
      }

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: `meta ahorro|${name}|${percentage.toFixed(2)}|${temporality}`,
          targetAmount,
          currentAmount: 0,
          deadline
        }
      });

      return NextResponse.json(goal, { status: 201 });
    }

    const input = goalSchema.parse(body);

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: input.title,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        deadline: new Date(input.deadline)
      }
    });

    return NextResponse.json(goal, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Datos de meta invalidos.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();

    const goalId = String(body.goalId || '');
    const targetAmountRaw = body.targetAmount;
    const targetAmount = typeof targetAmountRaw === 'string'
      ? Number(targetAmountRaw.replace(',', '.'))
      : Number(targetAmountRaw);

    if (!goalId || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json({ error: 'Datos de actualizacion invalidos.' }, { status: 400 });
    }

    const existing = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Meta no encontrada.' }, { status: 404 });
    }

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: { targetAmount }
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar la meta.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const goalId = String(body.goalId || '');
    const snapshotId = String(body.snapshotId || '');

    if (snapshotId) {
      const snapshot = await prisma.goalMonthlySnapshot.findUnique({ where: { id: snapshotId } });
      if (!snapshot || snapshot.userId !== user.id) {
        return NextResponse.json({ error: 'Registro de historial no encontrado.' }, { status: 404 });
      }

      await prisma.goalMonthlySnapshot.delete({ where: { id: snapshotId } });
      return NextResponse.json({ ok: true, message: 'Registro de historial eliminado correctamente.' });
    }

    if (!goalId) {
      return NextResponse.json({ error: 'Falta el identificador de la meta.' }, { status: 400 });
    }

    const existing = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Meta no encontrada.' }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id: goalId } });
    return NextResponse.json({ ok: true, message: 'Meta eliminada correctamente.' });
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar la meta.' }, { status: 400 });
  }
}
