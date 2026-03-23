'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiRequest } from '@/lib/client-api';

type Lesson = {
  id: string;
  title: string;
  level: number;
  theory: string;
  example: string;
  completed: boolean;
  unlocked: boolean;
  exercises: Array<{ id: string; type: string; instructions: string }>;
};

type ExerciseResponse = {
  theory: string;
  example: string;
  exercise: string;
  monthlyExpense: number;
};

type MotivationResponse = {
  dayOfYear: number;
  phrase: string;
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

const THEORY_KEYWORDS = [
  'visibilidad',
  'gasto',
  'gastos',
  'presupuesto',
  'ahorro',
  'deuda',
  'inversión',
  'inflación',
  'riesgo',
  'disciplina',
  'diversificación',
  'metas',
  'datos reales',
  'fijos',
  'variables',
  'discrecionales',
  'categoría',
  'categorías',
  'optimizar',
  'ajuste',
  'resultado'
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForMatch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function renderHighlightedText(text: string) {
  const sortedKeywords = [...THEORY_KEYWORDS].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${sortedKeywords.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isKeyword = THEORY_KEYWORDS.some((keyword) => normalizeForMatch(keyword) === normalizeForMatch(part));
    if (!isKeyword) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <strong key={`${part}-${index}`} className="font-semibold text-slate-900">
        {part}
      </strong>
    );
  });
}

export default function EducacionPage() {
  const [token, setToken] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercise, setExercise] = useState<ExerciseResponse | null>(null);
  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

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
      const [meData, lessonsData, exerciseData, motivationData] = await Promise.all([
        apiRequest<MeResponse>('/auth/me', {}, authToken),
        apiRequest<Lesson[]>('/education/lessons', {}, authToken),
        apiRequest<ExerciseResponse>('/education/exercise', {}, authToken),
        apiRequest<MotivationResponse>('/motivation/today', {}, authToken)
      ]);

      const sortedLessons = [...lessonsData].sort((a, b) => a.level - b.level);

      setUser(meData.user);
      setLessons(sortedLessons);
      setExercise(exerciseData);
      setDailyPhrase(motivationData.phrase || '');

      setActiveIndex((current) => {
        if (sortedLessons.length === 0) return 0;
        if (current >= sortedLessons.length) return sortedLessons.length - 1;

        const firstPending = sortedLessons.findIndex((item) => !item.completed);
        if (firstPending === -1) return current;

        return current <= firstPending ? current : firstPending;
      });

      return sortedLessons;
    } catch (err) {
      setError((err as Error).message);
      return [] as Lesson[];
    }
  }

  useEffect(() => {
    if (token) {
      void loadData(token);
    }
  }, [token]);

  const progress = useMemo(() => {
    if (lessons.length === 0) return 0;
    const completed = lessons.filter((item) => item.completed).length;
    return Math.round((completed / lessons.length) * 100);
  }, [lessons]);

  const currentLesson = lessons[activeIndex];
  const canGoBack = activeIndex > 0;
  const canGoNext = activeIndex < lessons.length - 1;

  const detailedTheory = useMemo(() => {
    if (!currentLesson) return [] as string[];

    if (currentLesson.level === 1) {
      return [
        'Registrar gastos es convertir tu dinero en informacion util: cuando sabes en que gastas, puedes corregir rapido y sin improvisar.',
        'El objetivo en esta fase es observar tus habitos de consumo con calma, sin juzgar, para detectar donde puedes mejorar con el menor esfuerzo posible.',
        'La forma de aplicarlo es sencilla: durante 7-14 dias anotas todo, luego etiquetas cada gasto por categoria, revisas donde se concentra el dinero y ajustas el gasto repetido que menos aporta.',
        'Ejemplo practico: si delivery son 120 EUR al mes, bajar a 90 EUR libera 30 EUR que puedes enviar directo a fondo de emergencia o deuda.'
      ];
    }

    if (currentLesson.level === 2) {
      return [
        'La regla 50/30/20 es una plantilla para decidir antes de gastar: primero cubres base, luego estilo de vida, luego construyes futuro.',
        '50% necesidades: vivienda, comida base, transporte, salud y servicios clave. Si pasas de este limite, revisa coste de vivienda, deudas y consumo de servicios.',
        '30% estilo de vida: ocio, salidas, extras y caprichos. Este bloque da flexibilidad, pero tambien es el primero que se ajusta cuando falta margen.',
        '20% ahorro o deuda: crea seguridad financiera. Si tienes deuda cara, prioriza bajarla; si no, prioriza fondo de emergencia e inversion gradual.',
        'Si hoy no llegas al 20%, usa escalado: 5% el primer mes, 8% el segundo, 10-12% despues. La constancia vale mas que la perfeccion inmediata.',
        'En el cierre mensual compara lo planificado con lo real, detecta el desvio principal y deja definidos pocos ajustes concretos para el siguiente mes, para que realmente se cumplan.'
      ];
    }

    if (currentLesson.level === 3) {
      return [
        'El fondo de emergencia es un colchon de seguridad: evita que un problema puntual se convierta en deuda cara o estres prolongado.',
        'Emergencia real: salud, perdida de empleo, reparacion critica de vivienda, averia del transporte necesario para trabajar.',
        'No es emergencia: viajes, ofertas, regalos, renovaciones esteticas o compras impulsivas. Diferenciar esto protege tu estabilidad.',
        'Construccion en fases: fase 1 un mes de gastos esenciales, fase 2 tres meses, fase 3 seis meses si tus ingresos son inestables.',
        'Como hacerlo: cuenta separada, aportacion automatica mensual y regla escrita de uso para evitar decisiones emocionales.',
        'Si usas el fondo, el plan siguiente es reponerlo antes de abrir nuevos objetivos financieros.'
      ];
    }

    if (currentLesson.level === 4) {
      return [
        'Aumentar ingresos es subir tu capacidad de avance: con mas entrada, aceleras ahorro, reduccion de deuda e inversion.',
        'Empieza con una opcion viable, no perfecta: servicios puntuales, venta de habilidades, horas extra planificadas o freelance sencillo.',
        'Para decidir bien, evalua el tiempo real disponible, el ingreso probable y si puedes sostenerlo cada semana sin desgaste excesivo.',
        'Prueba controlada de 30 dias: registra horas, ingresos y energia invertida para medir rentabilidad real por hora.',
        'Criterio de decision: mantienes lo que da buen retorno y encaja en tu vida; descartas lo que paga poco y agota demasiado.',
        'Si valida, conviertelo en sistema: meta mensual, revision quincenal y porcentaje fijo del ingreso extra para objetivos concretos.'
      ];
    }

    if (currentLesson.level === 5) {
      return [
        'Invertir es hacer que tu dinero crezca con el tiempo para proteger poder de compra y construir patrimonio.',
        'Inflacion: cada ano el dinero suele comprar menos. Si no hay rendimiento, tu capacidad de compra cae aunque ahorres.',
        'Tres bases para empezar: riesgo (variacion posible), plazo (tiempo que mantienes la estrategia) y diversificacion (repartir para reducir dependencia).',
        'Para empezar bien, define un objetivo concreto, fija un plazo realista, elige una aportacion mensual sostenible y automatiza el proceso para no depender de la motivacion del momento.',
        'Disciplina clave: evitar entrar y salir por miedo o euforia. Las decisiones impulsivas suelen destruir resultados de largo plazo.',
        'Revision compacta trimestral: comprobar avance, rebalancear si hace falta y seguir el plan sin cambios bruscos.'
      ];
    }

    return [currentLesson.theory];
  }, [currentLesson]);

  const isAccessible = useMemo(() => {
    if (lessons.length === 0) return false;
    if (activeIndex === 0) return true;

    const previous = lessons[activeIndex - 1];
    return Boolean(previous?.completed);
  }, [activeIndex, lessons]);

  async function completeCurrentLesson() {
    if (!token || !currentLesson || saving || !isAccessible || currentLesson.completed) return;

    try {
      setSaving(true);
      setMessage('');
      const completedLessonId = currentLesson.id;
      await apiRequest(
        '/education/progress',
        {
          method: 'POST',
          body: JSON.stringify({ lessonId: currentLesson.id })
        },
        token
      );

      setMessage('Lección marcada como completada.');
      const updatedLessons = await loadData(token);
      const completedIndex = updatedLessons.findIndex((item) => item.id === completedLessonId);
      const nextIndex = completedIndex >= 0
        ? Math.min(completedIndex + 1, Math.max(updatedLessons.length - 1, 0))
        : 0;

      setActiveIndex(nextIndex);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Educación financiera"
      subtitle="Aprende gestión financiera paso a paso, independiente del dashboard"
      showAdminLink={user?.role === 'admin'}
      onLogout={() => {
        localStorage.removeItem('token');
        window.location.href = '/';
      }}
    >
      {user?.mustChangePassword ? (
        <section className="card mb-4 border-amber-300 bg-amber-50">
          <h2 className="text-lg font-semibold text-amber-900">Debes cambiar tu contraseña</h2>
          <p className="mt-1 text-sm text-amber-800">
            Cambia tu contraseña temporal desde el panel para proteger tu cuenta.
          </p>
        </section>
      ) : null}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Ruta guiada</h2>
            <p className="text-sm text-slate-600">
              Completa cada lección en orden para avanzar al siguiente paso.
            </p>
          </div>
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs text-cyan-800">
            Progreso total: {progress}%
          </span>
        </div>

        <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${progress}%` }} />
        </div>

        {dailyPhrase ? (
          <div className="mt-4 rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-50 to-blue-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">✨ Frase del día</p>
            <p className="mt-2 text-base font-medium italic text-cyan-900">"{dailyPhrase}"</p>
          </div>
        ) : null}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[300px,1fr]">
        <article className="card">
          <h2 className="text-lg font-semibold">Pasos</h2>
          <div className="mt-3 space-y-2">
            {lessons.map((lesson, index) => {
              const previousCompleted = index === 0 ? true : lessons[index - 1]?.completed;
              const stepAccessible = Boolean(previousCompleted);
              const isActive = index === activeIndex;

              return (
                <button
                  key={lesson.id}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    isActive ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white'
                  } ${stepAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  onClick={() => {
                    if (stepAccessible) {
                      setActiveIndex(index);
                    }
                  }}
                  disabled={!stepAccessible}
                >
                  <p className="font-semibold">Paso {index + 1}: {lesson.title}</p>
                  <p className="text-xs text-slate-500">
                    {lesson.completed ? 'Completado' : stepAccessible ? 'Disponible' : 'Completa el paso anterior'}
                  </p>
                </button>
              );
            })}
          </div>
        </article>

        <article className="card">
          {currentLesson ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Paso {activeIndex + 1}: {currentLesson.title}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    currentLesson.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {currentLesson.completed ? 'Completado' : 'Pendiente'}
                </span>
              </div>

              {!isAccessible ? (
                <p className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  Para abrir este paso, primero completa el anterior.
                </p>
              ) : (
                <>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div className="rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">Teoria</p>
                      <p>
                        {currentLesson.theory}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Ejemplo</p>
                      <p>{currentLesson.example}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Ejercicio</p>
                      <p>{currentLesson.exercises[0]?.instructions || 'Este paso no tiene ejercicio asignado todavía.'}</p>
                    </div>
                  </div>

                  {!currentLesson.completed ? (
                    <button className="primary-btn mt-4" onClick={completeCurrentLesson} disabled={saving}>
                      {saving ? 'Guardando...' : 'Marcar paso como completado'}
                    </button>
                  ) : null}
                </>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="ghost-btn"
                  onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                  disabled={!canGoBack}
                >
                  Paso anterior
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => setActiveIndex((current) => Math.min(lessons.length - 1, current + 1))}
                  disabled={!canGoNext}
                >
                  Paso siguiente
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Aún no hay lecciones cargadas.</p>
          )}

          {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </article>
      </section>

    </AppShell>
  );
}

