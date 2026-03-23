'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import { MetricCard } from '@/components/metric-card';
import { apiRequest } from '@/lib/client-api';
import { DEFAULT_CATEGORIES } from '@/lib/constants';

type TransactionResponse = {
  month: number;
  year: number;
  transactions: Array<{
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    date: string;
    description: string | null;
  }>;
  total_income: number;
  total_expense: number;
  savings: number;
};

type AnalyticsResponse = {
  year: number;
  monthly: Array<{ month: number; income: number; expense: number }>;
  insights: string[];
  expenseByCategory: Record<string, number>;
};

type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
};

type GoalHistoryItem = {
  id: string;
  year: number;
  month: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  achieved: boolean;
};

type GoalsResponse = {
  period: { month: number; year: number };
  goals: Goal[];
  history: GoalHistoryItem[];
};

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    mustChangePassword: boolean;
    accountExpiresAt?: string | null;
  };
};

const COLORS = ['#0f766e', '#ea580c', '#0ea5e9', '#16a34a', '#7c3aed', '#f43f5e'];

function formatTransactionType(type: 'income' | 'expense') {
  return type === 'income' ? 'Ingreso' : 'Gasto';
}

function capitalizeFirstLetter(value: string) {
  const text = value.trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseSavingsAllocationGoal(title: string) {
  const match = title.match(/^meta ahorro\|(.+)\|([0-9]+(?:[.,][0-9]+)?)\|(.+)$/i);
  if (!match) return null;

  const name = match[1].trim();
  const percentage = Number(match[2].replace(',', '.'));
  const temporality = match[3].trim().toLowerCase();

  if (!name || !Number.isFinite(percentage) || percentage <= 0) return null;
  return { name, percentage, temporality };
}

function formatTemporalityLabel(value: string) {
  if (value === 'mensual') return 'Mensual';
  if (value === 'trimestral') return 'Trimestral';
  if (value === 'semestral') return 'Semestral';
  if (value === 'anual') return 'Anual';
  if (value === 'fecha exacta') return 'Fecha exacta';
  if (value === 'sin fecha') return 'Sin fecha';
  return value;
}

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [year, setYear] = useState(dayjs().year());

  const [tx, setTx] = useState<TransactionResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalHistory, setGoalHistory] = useState<GoalHistoryItem[]>([]);
  const [error, setError] = useState('');
  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [transactionMsg, setTransactionMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newLimitCategory, setNewLimitCategory] = useState('alimentacion');
  const [newLimitAmount, setNewLimitAmount] = useState('200');
  const [limitMsg, setLimitMsg] = useState('');
  const [newSavingsGoalName, setNewSavingsGoalName] = useState('');
  const [newSavingsGoalPercentage, setNewSavingsGoalPercentage] = useState('20');
  const [newSavingsGoalTargetAmount, setNewSavingsGoalTargetAmount] = useState('1000');
  const [newSavingsGoalTemporality, setNewSavingsGoalTemporality] = useState('mensual');
  const [newSavingsGoalExactDate, setNewSavingsGoalExactDate] = useState(dayjs().add(1, 'month').format('YYYY-MM-DD'));
  const [savingsGoalMsg, setSavingsGoalMsg] = useState('');
  const [editingLimitByGoal, setEditingLimitByGoal] = useState<Record<string, string>>({});
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [savingLimitGoalId, setSavingLimitGoalId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [pendingDeleteGoalId, setPendingDeleteGoalId] = useState<string | null>(null);
  const [isControlSummaryOpen, setIsControlSummaryOpen] = useState(false);
  const [movementDetailSelection, setMovementDetailSelection] = useState<{
    title: string;
    items: TransactionResponse['transactions'];
  } | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      window.location.href = '/';
      return;
    }
    setToken(stored);
  }, []);

  async function loadData(authToken: string) {
    try {
      setError('');
      const [meData, txData, analyticsData, goalsData] = await Promise.all([
        apiRequest<MeResponse>('/auth/me', {}, authToken),
        apiRequest<TransactionResponse>(`/transactions?month=${month}&year=${year}`, {}, authToken),
        apiRequest<AnalyticsResponse>(`/analytics/monthly-comparison?year=${year}`, {}, authToken),
        apiRequest<GoalsResponse>(`/goals?month=${month}&year=${year}`, {}, authToken)
      ]);

      setUser(meData.user);
      setTx(txData);
      setAnalytics(analyticsData);
      setGoals(goalsData.goals);
      setGoalHistory(goalsData.history);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    if (token) {
      void loadData(token);
    }
  }, [token, month, year]);

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const dateValue = String(form.get('date') || dayjs().format('YYYY-MM-DD'));
    const amountValue = String(form.get('amount') || '').replace(',', '.');

    try {
      setTransactionMsg('');
      await apiRequest(
        '/transactions',
        {
          method: 'POST',
          body: JSON.stringify({
            type: form.get('type'),
            amount: amountValue,
            category: form.get('category'),
            date: dateValue,
            description: form.get('description')
          })
        },
        token
      );

      const submittedDate = dayjs(dateValue);
      if (submittedDate.isValid()) {
        setMonth(submittedDate.month() + 1);
        setYear(submittedDate.year());
      }

      formElement.reset();
      setTransactionMsg('Movimiento guardado correctamente.');
      await loadData(token);
    } catch (err) {
      setTransactionMsg((err as Error).message);
    }
  }

  async function createSavingsAllocationGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const name = newSavingsGoalName.trim();
    const percentage = Number(newSavingsGoalPercentage.replace(',', '.'));
    const targetAmount = Number(newSavingsGoalTargetAmount.replace(',', '.'));
    const temporality = newSavingsGoalTemporality;

    if (!name || !Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      setSavingsGoalMsg('Introduce nombre y porcentaje valido (1 a 100).');
      return;
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setSavingsGoalMsg('Introduce el importe objetivo exacto que necesitas para la meta.');
      return;
    }

    if (temporality === 'fecha exacta' && !newSavingsGoalExactDate) {
      setSavingsGoalMsg('Selecciona una fecha exacta para esta meta.');
      return;
    }

    const nextTotal = savingsAllocationTotal + percentage;
    if (nextTotal > 100) {
      setSavingsGoalMsg(`La asignacion total no puede superar 100%. Te quedas en ${remainingSavingsPercentage.toFixed(2)}% disponible.`);
      return;
    }

    try {
      setSavingsGoalMsg('');
      await apiRequest(
        '/goals',
        {
          method: 'POST',
          body: JSON.stringify({
            kind: 'savings-allocation',
            name,
            percentage,
            targetAmount,
            temporality,
            exactDate: temporality === 'fecha exacta' ? newSavingsGoalExactDate : undefined
          })
        },
        token
      );

      setNewSavingsGoalName('');
      setNewSavingsGoalPercentage('20');
      setNewSavingsGoalTargetAmount('1000');
      setNewSavingsGoalTemporality('mensual');
      setNewSavingsGoalExactDate(dayjs().add(1, 'month').format('YYYY-MM-DD'));
      setSavingsGoalMsg('Meta de ahorro creada correctamente.');
      await loadData(token);
    } catch (err) {
      setSavingsGoalMsg((err as Error).message);
    }
  }

  async function createSpendingLimit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const category = newLimitCategory.trim().toLowerCase();
    const amount = Number(newLimitAmount.replace(',', '.'));

    if (!category || !Number.isFinite(amount) || amount <= 0) {
      setLimitMsg('Introduce una categoria y un limite valido.');
      return;
    }

    try {
      setLimitMsg('');
      await apiRequest(
        '/goals',
        {
          method: 'POST',
          body: JSON.stringify({
            title: `Limite de gasto en ${category} (mensual)`,
            targetAmount: amount,
            currentAmount: 0,
            deadline: dayjs().endOf('month').format('YYYY-MM-DD')
          })
        },
        token
      );

      setLimitMsg('Limite mensual creado correctamente.');
      await loadData(token);
    } catch (err) {
      setLimitMsg((err as Error).message);
    }
  }

  async function updateGoalTargetAmount(goalId: string) {
    if (!token) return;
    const value = editingLimitByGoal[goalId];
    const amount = Number((value || '').replace(',', '.'));

    if (!Number.isFinite(amount) || amount <= 0) {
      setLimitMsg('El nuevo importe objetivo debe ser mayor que 0.');
      return;
    }

    try {
      setSavingLimitGoalId(goalId);
      setLimitMsg('');
      await apiRequest(
        '/goals',
        {
          method: 'PATCH',
          body: JSON.stringify({ goalId, targetAmount: amount })
        },
        token
      );

      setLimitMsg('Meta actualizada correctamente.');
      await loadData(token);
    } catch (err) {
      setLimitMsg((err as Error).message);
    } finally {
      setSavingLimitGoalId(null);
    }
  }

  async function deleteGoal(goalId: string) {
    if (!token) return;

    try {
      setDeletingGoalId(goalId);
      setPendingDeleteGoalId(null);
      setLimitMsg('');
      setSavingsGoalMsg('');
      await apiRequest(
        '/goals',
        {
          method: 'DELETE',
          body: JSON.stringify({ goalId })
        },
        token
      );
      setLimitMsg('Meta eliminada correctamente.');
      await loadData(token);
    } catch (err) {
      setLimitMsg((err as Error).message);
    } finally {
      setDeletingGoalId(null);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get('currentPassword') || '');
    const newPassword = String(formData.get('newPassword') || '');

    try {
      setPasswordMsg('');
      await apiRequest(
        '/auth/change-password',
        {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword })
        },
        token
      );

      event.currentTarget.reset();
      setPasswordMsg('Contrasena cambiada correctamente.');
      await loadData(token);
    } catch (err) {
      setPasswordMsg((err as Error).message);
    }
  }

  async function deleteTransaction(transactionId: string) {
    if (!token) return;
    const confirmed = window.confirm('Vas a eliminar este movimiento. Esta accion no se puede deshacer.');
    if (!confirmed) return;

    try {
      setDeletingId(transactionId);
      setTransactionMsg('');
      await apiRequest(
        '/transactions',
        {
          method: 'DELETE',
          body: JSON.stringify({ transactionId })
        },
        token
      );
      setTransactionMsg('Movimiento eliminado correctamente.');
      await loadData(token);
    } catch (err) {
      setTransactionMsg((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  const pieData = useMemo(() => {
    const source = analytics?.expenseByCategory || {};
    return Object.keys(source).map((category) => ({
      name: category,
      value: source[category]
    }));
  }, [analytics]);

  const monthLabel = dayjs(`${year}-${month}-01`).format('MMMM YYYY');

  const spendingGoals = useMemo(
    () => goals.filter((goal) => goal.title.toLowerCase().includes('limite de gasto en')),
    [goals]
  );

  const savingsAllocationGoals = useMemo(
    () =>
      goals
        .map((goal) => {
          const parsed = parseSavingsAllocationGoal(goal.title);
          if (!parsed) return null;
          return { ...goal, ...parsed };
        })
        .filter((goal): goal is Goal & { name: string; percentage: number; temporality: string } => Boolean(goal)),
    [goals]
  );

  const savingsAllocationTotal = useMemo(
    () => savingsAllocationGoals.reduce((acc, goal) => acc + goal.percentage, 0),
    [savingsAllocationGoals]
  );

  const remainingSavingsPercentage = Math.max(0, 100 - savingsAllocationTotal);

  const predefinedLimitCategories = useMemo(
    () => [...DEFAULT_CATEGORIES].map((category) => category.toLowerCase()),
    []
  );

  const spendingGoalCategories = useMemo(
    () =>
      spendingGoals
        .map((goal) => {
          const match = goal.title.match(/^limite de gasto en (.+) \(mensual\)$/i);
          return match ? match[1].trim().toLowerCase() : null;
        })
        .filter((value): value is string => Boolean(value)),
    [spendingGoals]
  );

  const transactionsByCategory = useMemo(() => {
    const source = tx?.transactions || [];
    const map: Record<string, Array<TransactionResponse['transactions'][number]>> = {};
    for (const category of spendingGoalCategories) {
      map[category] = source.filter(
        (item) => item.type === 'expense' && item.category.toLowerCase() === category
      );
    }
    return map;
  }, [tx, spendingGoalCategories]);

  const incomeTransactions = useMemo(
    () => (tx?.transactions || []).filter((item) => item.type === 'income'),
    [tx]
  );

  const selectedPeriodHistoryItems = useMemo(
    () => goalHistory.filter((item) => item.month === month && item.year === year),
    [goalHistory, month, year]
  );

  useEffect(() => {
    setEditingLimitByGoal((current) => {
      let changed = false;
      const next = { ...current };
      for (const goal of goals) {
        if (next[goal.id] === undefined) {
          next[goal.id] = goal.targetAmount.toFixed(2);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [goals]);

  useEffect(() => {
    if (predefinedLimitCategories.length === 0) return;
    setNewLimitCategory((current) =>
      predefinedLimitCategories.includes(current.toLowerCase()) ? current : predefinedLimitCategories[0]
    );
  }, [predefinedLimitCategories]);

  return (
    <AppShell
      title={user?.name ? `Hola, ${capitalizeFirstLetter(user.name)}` : 'Mi panel'}
      subtitle="Controla ingresos, gastos y metas de forma clara y mensual."
      headerBadgeText={
        user?.accountExpiresAt
          ? `Vigencia activa hasta ${dayjs(user.accountExpiresAt).format('DD/MM/YYYY')}`
          : undefined
      }
      showAdminLink={user?.role === 'admin'}
      onLogout={() => {
        localStorage.removeItem('token');
        window.location.href = '/';
      }}
    >
      {user?.mustChangePassword ? (
        <section className="card mb-4 border-amber-300 bg-amber-50">
          <h2 className="text-lg font-semibold text-amber-900">Debes cambiar tu contrasena</h2>
          <p className="mt-1 text-sm text-amber-800">
            Estas usando una contrasena temporal enviada por el administrador. Cambiala ahora para continuar con seguridad.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Ingresos del mes" value={`${tx?.total_income?.toFixed(2) || '0.00'} EUR`} />
        <MetricCard label="Gastos del mes" value={`${tx?.total_expense?.toFixed(2) || '0.00'} EUR`} />
        <MetricCard label="Ahorro del mes" value={`${tx?.savings?.toFixed(2) || '0.00'} EUR`} />
        <MetricCard
          label="Balance total"
          value={`${((tx?.total_income || 0) - (tx?.total_expense || 0)).toFixed(2)} EUR`}
        />
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="card">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Agregar movimiento</h2>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700">{monthLabel}</span>
          </div>
          <form className="grid gap-2" onSubmit={addTransaction}>
            <select
              className="field"
              name="type"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as 'income' | 'expense')}
              required
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
            <input className="field" name="amount" type="number" min={0.01} step={0.01} placeholder="Importe" required />
            {transactionType === 'expense' ? (
              <>
                <input className="field" name="category" list="categories" placeholder="Categoria" required />
                <datalist id="categories">
                  {DEFAULT_CATEGORIES.map((category) => (
                    <option value={category} key={category} />
                  ))}
                </datalist>
              </>
            ) : null}
            <input className="field" name="date" type="date" defaultValue={dayjs().format('YYYY-MM-DD')} required />
            <input className="field" name="description" placeholder="Descripcion (opcional)" />
            <button className="primary-btn">Guardar movimiento</button>
          </form>
          {transactionMsg ? <p className="mt-2 text-sm text-slate-700">{transactionMsg}</p> : null}
        </article>

        <article className="card">
          <h2 className="text-lg font-semibold">Control mensual</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              className="field"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              <option value={1}>Enero</option>
              <option value={2}>Febrero</option>
              <option value={3}>Marzo</option>
              <option value={4}>Abril</option>
              <option value={5}>Mayo</option>
              <option value={6}>Junio</option>
              <option value={7}>Julio</option>
              <option value={8}>Agosto</option>
              <option value={9}>Septiembre</option>
              <option value={10}>Octubre</option>
              <option value={11}>Noviembre</option>
              <option value={12}>Diciembre</option>
            </select>
            <input
              className="field"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              type="number"
              min={2020}
              max={2100}
            />
          </div>
          <p className="mt-3 text-sm text-stone-600">
            Filtra por mes y anio para revisar movimientos y objetivos del periodo.
          </p>
          <div className="mt-3 flex justify-center">
            <button className="primary-btn" onClick={() => setIsControlSummaryOpen(true)} type="button">
              Ver resumen del periodo
            </button>
          </div>
        </article>
      </section>

      {isControlSummaryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-800">
                Resumen del periodo: {dayjs(`${year}-${month}-01`).format('MMMM YYYY')}
              </h3>
              <button className="ghost-btn px-3 py-1 text-xs" onClick={() => setIsControlSummaryOpen(false)} type="button">
                Cerrar
              </button>
            </div>

            <div className="max-h-[74vh] overflow-y-auto p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Movimientos del periodo</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Tipo</th>
                      <th className="py-2">Categoria</th>
                      <th className="py-2">Descripcion</th>
                      <th className="py-2">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tx?.transactions || []).map((item) => (
                      <tr key={item.id} className="border-b border-slate-50">
                        <td className="py-2">{dayjs(item.date).format('YYYY-MM-DD')}</td>
                        <td className="py-2">{formatTransactionType(item.type)}</td>
                        <td className="py-2">{item.category || '-'}</td>
                        <td className="py-2">{item.description || '-'}</td>
                        <td className="py-2">{item.amount.toFixed(2)} EUR</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(tx?.transactions || []).length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No hay movimientos para este periodo.</p>
              ) : null}

              <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Metas del periodo</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="py-2">Meta</th>
                      <th className="py-2">Progreso</th>
                      <th className="py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((goal) => {
                      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                      const isCompleted = progress >= 100;
                      return (
                        <tr key={goal.id} className="border-b border-slate-50">
                          <td className="py-2">{goal.title}</td>
                          <td className="py-2">
                            {goal.currentAmount.toFixed(2)} / {goal.targetAmount.toFixed(2)} EUR ({Math.min(100, progress).toFixed(0)}%)
                          </td>
                          <td className="py-2">
                            <span className={`rounded-full px-2 py-1 text-xs ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {isCompleted ? 'Cumplida' : 'En progreso'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {goals.length === 0 ? <p className="mt-2 text-sm text-slate-600">No hay metas registradas para este periodo.</p> : null}

              <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Cierres guardados del periodo</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="py-2">Objetivo</th>
                      <th className="py-2">Resultado</th>
                      <th className="py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPeriodHistoryItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50">
                        <td className="py-2">{item.title}</td>
                        <td className="py-2">
                          {item.currentAmount.toFixed(2)} / {item.targetAmount.toFixed(2)} EUR
                        </td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-1 text-xs ${item.achieved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {item.achieved ? 'Cumplido' : 'No cumplido'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedPeriodHistoryItems.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No hay cierres guardados para este periodo.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="mt-4">
        <article className="card">
          <h2 className="text-lg font-semibold">Metas financieras</h2>
          <p className="mt-2 text-sm text-slate-600">
            Configura limites preestablecidos por categoria y crea metas de ahorro por porcentaje con temporalidad.
          </p>

          <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={createSpendingLimit}>
            <select
              className="field"
              value={newLimitCategory}
              onChange={(e) => setNewLimitCategory(e.target.value)}
              required
            >
              {predefinedLimitCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="relative">
              <input
                className="field pr-14"
                type="number"
                min={0.01}
                step={0.01}
                value={newLimitAmount}
                onChange={(e) => setNewLimitAmount(e.target.value)}
                placeholder="Limite mensual"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600">EUR</span>
            </div>
            <button className="primary-btn">Crear limite mensual</button>
          </form>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-medium text-emerald-800">
              Asignacion de ahorro total: {savingsAllocationTotal.toFixed(2)}% / 100%
            </p>
            <p className="text-xs text-emerald-700">
              Disponible para nuevas metas: {remainingSavingsPercentage.toFixed(2)}%
            </p>
          </div>

          <form className="mt-3 grid gap-2 md:grid-cols-5" onSubmit={createSavingsAllocationGoal}>
            <input
              className="field"
              value={newSavingsGoalName}
              onChange={(e) => setNewSavingsGoalName(e.target.value)}
              placeholder="Nombre de la meta"
              required
            />
            <div className="relative">
              <input
                className="field pr-10"
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={newSavingsGoalPercentage}
                onChange={(e) => setNewSavingsGoalPercentage(e.target.value)}
                placeholder="Porcentaje"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600">%</span>
            </div>
            <div className="relative">
              <input
                className="field pr-14"
                type="number"
                min={0.01}
                step={0.01}
                value={newSavingsGoalTargetAmount}
                onChange={(e) => setNewSavingsGoalTargetAmount(e.target.value)}
                placeholder="Importe objetivo"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600">EUR</span>
            </div>
            <select
              className="field"
              value={newSavingsGoalTemporality}
              onChange={(e) => setNewSavingsGoalTemporality(e.target.value)}
              required
            >
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
              <option value="fecha exacta">Fecha exacta</option>
              <option value="sin fecha">Sin fecha</option>
            </select>
            {newSavingsGoalTemporality === 'fecha exacta' ? (
              <input
                className="field md:col-span-2"
                type="date"
                value={newSavingsGoalExactDate}
                onChange={(e) => setNewSavingsGoalExactDate(e.target.value)}
                required
              />
            ) : null}
            <button className="primary-btn">Crear meta de ahorro</button>
          </form>

          <ul className="mt-4 space-y-2 text-sm">
            {goals.map((goal) => {
              const isSpendingGoal = goal.title.toLowerCase().includes('limite de gasto en');
              const savingsAllocation = parseSavingsAllocationGoal(goal.title);
              const isSavingsAllocationGoal = Boolean(savingsAllocation);
              const pct = isSavingsAllocationGoal
                ? Math.min(100, goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0)
                : Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              const overLimit = isSpendingGoal && goal.currentAmount > goal.targetAmount;
              const barValue = Math.min(100, pct);

              const title = isSavingsAllocationGoal ? `Meta ahorro: ${savingsAllocation!.name}` : goal.title;
              return (
                <li key={goal.id} className="rounded-xl border border-orange-100 p-3">
                  <p className="font-semibold">{title}</p>
                  {isSpendingGoal ? (
                    <p className={overLimit ? 'text-rose-700' : 'text-stone-600'}>
                      Gastado: {goal.currentAmount.toFixed(2)} / {goal.targetAmount.toFixed(2)} EUR
                      {overLimit ? ' - Limite superado' : ''}
                    </p>
                  ) : isSavingsAllocationGoal ? (
                    <p className="text-stone-600">
                      Destino del ahorro: {savingsAllocation!.percentage.toFixed(2)}% - Temporalidad: {formatTemporalityLabel(savingsAllocation!.temporality)} - Objetivo: {goal.targetAmount.toFixed(2)} EUR
                      {savingsAllocation!.temporality === 'fecha exacta'
                        ? ` - Fecha objetivo: ${dayjs(goal.deadline).format('DD/MM/YYYY')}`
                        : ''}
                    </p>
                  ) : (
                    <p className="text-stone-600">
                      {goal.currentAmount.toFixed(2)} / {goal.targetAmount.toFixed(2)} EUR - {pct.toFixed(0)}%
                    </p>
                  )}
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full ${overLimit ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${barValue}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {isSavingsAllocationGoal
                      ? `Avance de la meta: ${goal.currentAmount.toFixed(2)} / ${goal.targetAmount.toFixed(2)} EUR (${pct.toFixed(0)}%)`
                      : `Progreso del mes: ${pct.toFixed(0)}%`}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      className="ghost-btn px-3 py-1 text-xs"
                      onClick={() => {
                        setEditingGoalId(goal.id);
                        setPendingDeleteGoalId(null);
                      }}
                      type="button"
                    >
                      Modificar
                    </button>
                    <button
                      className="danger-btn px-3 py-1 text-xs"
                      onClick={() => {
                        setPendingDeleteGoalId(goal.id);
                        setEditingGoalId(null);
                      }}
                      type="button"
                      disabled={deletingGoalId === goal.id}
                    >
                      {deletingGoalId === goal.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>

                  {editingGoalId === goal.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 p-2">
                      <input
                        className="field mt-0 w-40"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={editingLimitByGoal[goal.id] ?? goal.targetAmount.toFixed(2)}
                        onChange={(e) => setEditingLimitByGoal((current) => ({
                          ...current,
                          [goal.id]: e.target.value
                        }))}
                      />
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600">EUR</span>
                      <button
                        className="primary-btn px-3 py-1 text-xs"
                        onClick={() => updateGoalTargetAmount(goal.id)}
                        type="button"
                        disabled={savingLimitGoalId === goal.id}
                      >
                        {savingLimitGoalId === goal.id ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button
                        className="ghost-btn px-3 py-1 text-xs"
                        onClick={() => setEditingGoalId(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}

                  {pendingDeleteGoalId === goal.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                      <span>Confirma que quieres eliminar esta meta.</span>
                      <button
                        className="danger-btn px-3 py-1 text-xs"
                        onClick={() => deleteGoal(goal.id)}
                        type="button"
                        disabled={deletingGoalId === goal.id}
                      >
                        {deletingGoalId === goal.id ? 'Eliminando...' : 'Confirmar'}
                      </button>
                      <button
                        className="ghost-btn px-3 py-1 text-xs"
                        onClick={() => setPendingDeleteGoalId(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {limitMsg ? <p className="mt-2 text-sm text-slate-700">{limitMsg}</p> : null}
          {savingsGoalMsg ? <p className="mt-2 text-sm text-slate-700">{savingsGoalMsg}</p> : null}
        </article>
      </section>

      <section className="card mt-4">
        <h2 className="text-lg font-semibold">Detalle por movimientos ({monthLabel})</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pulsa en una tarjeta para ver todos los movimientos en un popup. Incluye detalle de ingresos y gastos.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <button
            className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-left transition hover:bg-emerald-100/70"
            onClick={() => setMovementDetailSelection({ title: 'Ingresos del periodo', items: incomeTransactions })}
            type="button"
          >
            <p className="font-semibold text-emerald-900">Ingresos</p>
            <p className="mt-1 text-xs text-emerald-700">Movimientos: {incomeTransactions.length}</p>
          </button>

          {spendingGoalCategories.map((category) => {
            const items = transactionsByCategory[category] || [];
            return (
              <button
                key={category}
                className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-left transition hover:bg-sky-100/70"
                onClick={() => setMovementDetailSelection({ title: `Gastos en ${category}`, items })}
                type="button"
              >
                <p className="font-semibold capitalize text-sky-900">Gastos en {category}</p>
                <p className="mt-1 text-xs text-sky-700">Movimientos: {items.length}</p>
              </button>
            );
          })}

          {spendingGoalCategories.length === 0 ? (
            <p className="text-sm text-slate-600 md:col-span-2 lg:col-span-3">
              No hay objetivos mensuales por categoria activos todavia.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-4">
        <article className="card">
          <h2 className="mb-3 text-lg font-semibold">Gasto por categoria</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={88}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="card mt-4">
        <details>
          <summary className="cursor-pointer text-lg font-semibold text-slate-800">Seguridad de cuenta</summary>
          <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={changePassword}>
            <input className="field" name="currentPassword" type="password" placeholder="Contrasena actual" required />
            <input className="field" name="newPassword" type="password" placeholder="Nueva contrasena" required />
            <button className="primary-btn">Cambiar contrasena</button>
          </form>
          {passwordMsg ? <p className="mt-2 text-sm text-stone-700">{passwordMsg}</p> : null}
        </details>
      </section>

      {movementDetailSelection ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-800">{movementDetailSelection.title}</h3>
              <button
                className="ghost-btn px-3 py-1 text-xs"
                onClick={() => setMovementDetailSelection(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Tipo</th>
                      <th className="py-2">Categoria</th>
                      <th className="py-2">Descripcion</th>
                      <th className="py-2">Importe</th>
                      <th className="py-2 text-center">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementDetailSelection.items.map((item) => (
                      <tr key={`${movementDetailSelection.title}-${item.id}`} className="border-b border-slate-50">
                        <td className="py-2">{dayjs(item.date).format('YYYY-MM-DD')}</td>
                        <td className="py-2">{formatTransactionType(item.type)}</td>
                        <td className="py-2">{item.category === 'sin-categoria' ? '-' : item.category}</td>
                        <td className="py-2">{item.description || '-'}</td>
                        <td className="py-2">{item.amount.toFixed(2)} EUR</td>
                        <td className="py-2 text-center">
                          <button
                            className="danger-btn px-3 py-1 text-xs"
                            onClick={() => void deleteTransaction(item.id)}
                            type="button"
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {movementDetailSelection.items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No hay movimientos en este detalle para el periodo seleccionado.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </AppShell>
  );
}
