import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

function getDayOfYear(date = new Date()) {
  const year = date.getFullYear();
  const start = Date.UTC(year, 0, 0);
  const now = Date.UTC(year, date.getMonth(), date.getDate());
  return Math.floor((now - start) / 86400000);
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);

    const dayOfYear = getDayOfYear();
    const quote = await prisma.motivationQuote.findUnique({
      where: { dayOfYear },
      select: { text: true }
    });

    if (quote) {
      return NextResponse.json({ dayOfYear, phrase: quote.text });
    }

    const fallback = await prisma.motivationQuote.findFirst({
      orderBy: { dayOfYear: 'asc' },
      select: { text: true }
    });

    return NextResponse.json({
      dayOfYear,
      phrase: fallback?.text || 'Cada paso pequeno de hoy construye una version mas fuerte de ti manana.'
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}
