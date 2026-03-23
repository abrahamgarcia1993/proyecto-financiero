type MonthlyTotals = {
  totalIncome: number;
  totalExpense: number;
  previousExpense: number;
  expenseByCategory: Record<string, number>;
};

export function generateInsights(input: MonthlyTotals) {
  const insights: string[] = [];
  const leisure = (input.expenseByCategory.ocio || 0) + (input.expenseByCategory.leisure || 0);
  const totalExpense = input.totalExpense || 1;
  const leisurePct = (leisure / totalExpense) * 100;

  if (leisurePct > 20) {
    insights.push(`Has gastado ${leisurePct.toFixed(1)}% en ocio (recomendado: 20%).`);
  }

  if (input.totalExpense > input.previousExpense && input.previousExpense > 0) {
    const delta = input.totalExpense - input.previousExpense;
    insights.push(`Has gastado ${delta.toFixed(2)} EUR mas que el mes pasado.`);
  }

  const biggestCategory = Object.entries(input.expenseByCategory).sort((a, b) => b[1] - a[1])[0];
  if (biggestCategory) {
    const [category, amount] = biggestCategory;
    const potential = amount * 0.15;
    insights.push(`Podrias ahorrar ${potential.toFixed(2)} EUR reduciendo ${category} un 15%.`);
  }

  if (insights.length === 0) {
    insights.push('Gran consistencia. Sigue registrando gastos para desbloquear mas recomendaciones.');
  }

  return insights;
}
