import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const LESSONS_ES = {
  1: {
    title: 'Registra cada gasto',
    theory:
      'Objetivo del paso: ganar claridad total sobre tu dinero. Si no sabes con precisión en qué gastas, no puedes mejorar tu resultado mensual de forma sostenible. Registrar cada gasto no es burocracia; es una herramienta de diagnóstico. Al anotar pagos grandes y pequeños durante varios días, conviertes una sensación difusa de “gasto mucho” en datos concretos para decidir con criterio. Esa visibilidad te permite identificar fugas, separar necesidades de impulsos y empezar a recuperar control sin decisiones emocionales.',
    example:
      'Caso real típico: 3 EUR diarios en café + 2 EUR en compras pequeñas parecen poco, pero al mes pueden superar 150 EUR. Cuando el cliente ve ese acumulado, entiende dónde ajustar sin tocar lo esencial y libera dinero para objetivos importantes.',
    exercise:
      'Durante 7 días registra todos tus gastos y clasifícalos por categoría. Cierre del ejercicio: identifica el gasto no esencial más repetido, calcula su coste mensual y define una acción concreta para reducirlo al menos un 10%.'
  },
  2: {
    title: 'Aplica el presupuesto 50/30/20',
    theory:
      'Objetivo del paso: transformar ingresos en un plan simple y repetible. El marco 50/30/20 no es una ley rígida, es una estructura para priorizar: 50% necesidades, 30% estilo de vida y 20% ahorro o deuda. Su valor está en que reduce improvisación y facilita conversaciones honestas sobre decisiones de gasto. Si el cliente no encaja hoy en esos porcentajes, se trabaja por fases: primero estabilizar, luego ajustar gradualmente. El foco profesional es progreso medible, no perfección inmediata.',
    example:
      'Con 1600 EUR netos, una referencia sería 800 EUR necesidades, 480 EUR estilo de vida y 320 EUR ahorro/deuda. Si necesidades suben a 950 EUR, no se abandona el método: se ajusta temporalmente el 30% y se define un plan de 2-3 meses para recuperar equilibrio.',
    exercise:
      'Calcula tu reparto real del último mes en los tres bloques. Después define dos ajustes concretos para el próximo mes con cifra objetivo (por ejemplo, liberar 60 EUR para ahorro o amortización de deuda).' 
  },
  3: {
    title: 'Base del fondo de emergencia',
    theory:
      'Objetivo del paso: proteger tu estabilidad ante imprevistos sin recurrir a deuda cara. El fondo de emergencia cumple una función defensiva: evita que un problema puntual desordene todo tu sistema financiero. Se construye por etapas: primero 1 mes de gastos esenciales, luego 3 y, según contexto laboral/familiar, hasta 6 meses. La clave técnica no es solo ahorrar, sino separar ese dinero, definir reglas de uso y mantener aportes automáticos para que el fondo crezca sin depender de motivación diaria.',
    example:
      'Si tus gastos esenciales son 900 EUR, la primera meta es 900 EUR. Con aportes automáticos de 90 EUR al mes se alcanza en 10 meses; si aparece un ingreso extraordinario, destinar una parte al fondo acorta ese plazo sin tensionar el presupuesto corriente.',
    exercise:
      'Define tu gasto esencial mensual y fija la meta inicial de 1 mes. Activa una transferencia automática mensual y añade una regla profesional: asignar un porcentaje fijo de todo ingreso extraordinario al fondo de emergencia.'
  },
  4: {
    title: 'Aumenta tus ingresos',
    theory:
      'Objetivo del paso: dejar de depender solo del recorte de gastos y crear palancas de crecimiento. Ahorrar tiene límite; incrementar ingresos amplía margen para cumplir metas más rápido. La estrategia profesional combina tres vías: optimizar empleo actual, activar ingresos complementarios y convertir habilidades en servicios concretos. La clave es seleccionar opciones viables para tu agenda, medir rentabilidad real (tiempo vs dinero) y escalar solo lo que demuestre resultados consistentes.',
    example:
      'Una mejora salarial de 120 EUR mensuales o un ingreso adicional de 80 EUR semanales cambia de forma tangible la capacidad de ahorro. Si ese ingreso se asigna desde el inicio a una meta concreta, el avance se acelera y se mantiene la motivación.',
    exercise:
      'Diseña una lista de 3 opciones de ingreso activables este mes. Para cada una, estima ingreso mensual, horas requeridas y dificultad de ejecución. Elige una para una prueba de 30 días y evalúa al cierre: ingreso real, tiempo invertido y posibilidad de escalar.'
  },
  5: {
    title: 'Fundamentos de inversion',
    theory:
      'Objetivo del paso: construir patrimonio real en el tiempo. Invertir no es apostar; es aplicar una metodología para que el dinero crezca por encima de la inflación y conserve poder de compra. El marco básico combina riesgo, horizonte y disciplina: defines cuánto riesgo puedes tolerar, cuánto tiempo mantendrás la estrategia y cómo sostendrás aportes periódicos sin depender de emociones. La inversión efectiva para perfiles personales suele basarse en diversificación, constancia y revisión periódica, no en intentar adivinar el mejor momento del mercado.',
    example:
      'Si 5.000 EUR permanecen años sin rendimiento en un entorno inflacionario, su valor real cae. Si esa persona invierte de forma periódica en una estrategia diversificada a largo plazo, aumenta la probabilidad de mantener y mejorar su poder adquisitivo.',
    exercise:
      'Define un objetivo de inversión claro (por ejemplo, batir inflación), redacta tu perfil de riesgo en una frase, fija un aporte mensual sostenible y establece un plan de ejecución de 12 meses con revisión trimestral.'
  }
} as const;

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    const [lessons, progress, unlocks] = await Promise.all([
      prisma.lesson.findMany({
        include: { exercises: true },
        orderBy: [{ level: 'asc' }, { createdAt: 'asc' }]
      }),
      prisma.userProgress.findMany({ where: { userId: user.id } }),
      prisma.userLevelUnlock.findMany({ where: { userId: user.id } })
    ]);

    const unlockedLevels = new Set([1, ...unlocks.map((item) => item.level)]);
    const progressMap = new Map(progress.map((item) => [item.lessonId, item.completed]));

    return NextResponse.json(
      lessons.map((lesson) => ({
        ...lesson,
        title: LESSONS_ES[lesson.level as keyof typeof LESSONS_ES]?.title || lesson.title,
        theory: LESSONS_ES[lesson.level as keyof typeof LESSONS_ES]?.theory || lesson.theory,
        example: LESSONS_ES[lesson.level as keyof typeof LESSONS_ES]?.example || lesson.example,
        exercises: lesson.exercises.map((exercise, index) => ({
          ...exercise,
          instructions:
            index === 0 && LESSONS_ES[lesson.level as keyof typeof LESSONS_ES]?.exercise
              ? LESSONS_ES[lesson.level as keyof typeof LESSONS_ES].exercise
              : exercise.instructions
        })),
        completed: progressMap.get(lesson.id) || false,
        unlocked: unlockedLevels.has(lesson.level)
      }))
    );
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

