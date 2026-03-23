import dayjs from 'dayjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { generateInsights } from '@/lib/insights';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const year = Number(request.nextUrl.searchParams.get('year') || dayjs().year());

    const start = dayjs(`${year}-01-01`).startOf('year').toDate();
    const end = dayjs(start).endOf('year').toDate();

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' }
    });

    const monthly = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      income: 0,
      expense: 0
    }));

    const currentMonth = dayjs().month() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;

    const expenseByCategory: Record<string, number> = {};
    let currentExpense = 0;
    let previousExpense = 0;
    let currentIncome = 0;

    for (const transaction of transactions) {
      const month = dayjs(transaction.date).month() + 1;
      if (transaction.type === 'income') {
        monthly[month - 1].income += transaction.amount;
      } else {
        monthly[month - 1].expense += transaction.amount;
      }

      if (month === currentMonth) {
        if (transaction.type === 'income') {
          currentIncome += transaction.amount;
        } else {
          currentExpense += transaction.amount;
          expenseByCategory[transaction.category] =
            (expenseByCategory[transaction.category] || 0) + transaction.amount;
        }
      }

      if (month === previousMonth && transaction.type === 'expense') {
        previousExpense += transaction.amount;
      }
    }

    const insights = generateInsights({
      totalIncome: currentIncome,
      totalExpense: currentExpense,
      previousExpense,
      expenseByCategory
    });

    return NextResponse.json({ year, monthly, insights, expenseByCategory });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}
