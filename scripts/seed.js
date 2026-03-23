const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const lessons = [
  {
    title: 'Registra cada gasto',
    level: 1,
    theory:
      'Objetivo: ganar visibilidad total del dinero. Si no mides en que gastas, no puedes mejorar con consistencia. Registrar gastos convierte intuiciones en datos y te permite decidir con criterio.',
    example:
      'Gastos pequenos diarios parecen irrelevantes, pero al cierre mensual suelen representar importes altos. Ver el acumulado ayuda a ajustar sin improvisar.',
    exercise:
      'Durante 7 dias registra todos los gastos y clasificalos por categoria. Identifica el gasto no esencial mas repetido y define una reduccion objetivo.'
  },
  {
    title: 'Aplica el presupuesto 50/30/20',
    level: 2,
    theory:
      'El metodo 50/30/20 estructura tus ingresos en tres bloques para reducir improvisacion: necesidades, estilo de vida y ahorro/deuda. Es una guia de decision, no una regla rigida.',
    example:
      'Con 1600 EUR, una base puede ser 800 EUR necesidades, 480 EUR estilo de vida y 320 EUR ahorro/deuda. Si hay desbalance, se ajusta por fases con plan mensual.',
    exercise:
        'Calcula tu reparto real del ultimo mes y define dos ajustes concretos para mover dinero a ahorro o deuda.'
  },
  {
    title: 'Base del fondo de emergencia',
    level: 3,
    theory:
      'El fondo de emergencia protege tu estabilidad y evita deuda cara ante imprevistos. Se construye por etapas: primero 1 mes esencial, luego escalado progresivo.',
    example:
      'Si tus gastos esenciales son 900 EUR, la primera meta es 900 EUR. Con aportes automaticos y constancia, despues se escala a 3 o mas meses.',
    exercise:
        'Define tu gasto esencial mensual, automatiza aportes y establece regla de destinar parte de ingresos extraordinarios al fondo.'
  },
  {
    title: 'Aumenta tus ingresos',
    level: 4,
    theory:
      'Recortar gasto tiene limite; aumentar ingresos crea palancas de crecimiento. La estrategia profesional combina mejoras salariales e ingresos complementarios sostenibles.',
    example:
      'Una mejora salarial o ingreso extra mensual acelera metas de forma visible cuando se asigna desde el inicio a ahorro, deuda o inversion.',
    exercise:
        'Define 3 opciones de ingreso, prueba una 30 dias y evalua ingreso real, tiempo invertido y posibilidad de escalar.'
  },
  {
    title: 'Fundamentos de inversion',
    level: 5,
    theory:
      'Invertir es un proceso de largo plazo orientado a proteger y aumentar valor real del dinero. El objetivo inicial suele ser batir inflacion con riesgo controlado y disciplina.',
    example:
      'Aportes periodicos y diversificacion suelen ser mas efectivos que decisiones por impulso. La constancia mejora la probabilidad de preservar poder adquisitivo.',
    exercise:
      'Define objetivo, perfil de riesgo y plan de aportes mensuales durante 12 meses con revisiones trimestrales.'
  }
];

function buildMotivationalPhrases365() {
  const openings = [
    'Hoy es un buen dia para',
    'Tu progreso empieza cuando decides',
    'Cada decision pequeña te acerca a',
    'La disciplina diaria convierte',
    'Con calma y constancia puedes',
    'Un paso consciente hoy crea',
    'Lo que repites cada dia define',
    'Tu version financiera mejora cuando',
    'La claridad sobre tus numeros te permite',
    'No necesitas perfeccion para',
    'La consistencia silenciosa te ayuda a',
    'Tu futuro se construye al',
    'La accion bien enfocada consigue',
    'Con habitos simples puedes',
    'Cada ajuste inteligente abre espacio para',
    'El control real aparece cuando',
    'Tu tranquilidad crece si decides',
    'La mejora sostenible nace de',
    'Tus resultados cambian al',
    'El avance verdadero empieza por',
    'Cuando mides, puedes',
    'Cuando planificas, puedes',
    'Cuando priorizas, logras',
    'Cada semana bien gestionada fortalece',
    'Tu esfuerzo diario impulsa'
  ];

  const actions = [
    'ordenar tus gastos',
    'respetar tu presupuesto',
    'proteger tu fondo de emergencia',
    'reducir un gasto impulsivo',
    'cumplir un objetivo de ahorro',
    'priorizar lo importante',
    'evitar deudas innecesarias',
    'sumar una mejora concreta',
    'mantener tus habitos clave',
    'reforzar tu disciplina',
    'cerrar el mes con control',
    'tomar decisiones con datos',
    'asignar cada euro con intencion',
    'crear un sistema simple',
    'construir estabilidad financiera',
    'aumentar tu margen mensual',
    'fortalecer tu confianza',
    'convertir intencion en accion',
    'enfocar tu energia',
    'avanzar sin compararte'
  ];

  const endings = [
    'tu tranquilidad de manana',
    'un futuro mas estable',
    'metas que antes parecian lejanas',
    'resultados que se notan',
    'una base financiera mas fuerte',
    'mas libertad para decidir',
    'una relacion sana con el dinero',
    'progreso real y medible',
    'confianza en tus decisiones',
    'un camino claro para crecer',
    'menos estres y mas enfoque',
    'equilibrio entre presente y futuro',
    'un mes mas ordenado',
    'un cambio que se mantiene',
    'objetivos cumplidos con constancia',
    'mejores oportunidades',
    'mas seguridad para tu familia',
    'una rutina que te impulsa',
    'decisiones mas inteligentes',
    'la mejor version de tus finanzas'
  ];

  const phrases = [];
  const seen = new Set();

  for (const opening of openings) {
    for (const action of actions) {
      for (const ending of endings) {
        const phrase = `${opening} ${action} y consolida ${ending}.`;
        if (!seen.has(phrase)) {
          seen.add(phrase);
          phrases.push(phrase);
        }
        if (phrases.length === 365) {
          return phrases;
        }
      }
    }
  }

  return phrases;
}

async function main() {
  const adminEmail = 'abraham26mlg@gmail.com';
  const adminPassword = 'Admin12345!';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        role: 'admin',
        passwordHash: await bcrypt.hash(adminPassword, 10)
      }
    });
    console.log(`Admin creado: ${adminEmail}`);
  }

  for (const lesson of lessons) {
    const existingLessonInLevel = await prisma.lesson.findFirst({
      where: { level: lesson.level },
      orderBy: { createdAt: 'asc' }
    });

    const createdLesson = existingLessonInLevel
      ? await prisma.lesson.update({
          where: { id: existingLessonInLevel.id },
          data: {
            title: lesson.title,
            theory: lesson.theory,
            example: lesson.example
          }
        })
      : await prisma.lesson.create({
          data: {
            title: lesson.title,
            level: lesson.level,
            theory: lesson.theory,
            example: lesson.example
          }
        });

    const hasExercise = await prisma.exercise.findFirst({ where: { lessonId: createdLesson.id } });
    if (!hasExercise) {
      await prisma.exercise.create({
        data: {
          lessonId: createdLesson.id,
          type: 'practical-real-data',
          instructions: lesson.exercise
        }
      });
    } else {
      await prisma.exercise.update({
        where: { id: hasExercise.id },
        data: {
          instructions: lesson.exercise
        }
      });
    }
  }

  const motivationalPhrases = buildMotivationalPhrases365();
  for (let day = 1; day <= 365; day += 1) {
    await prisma.motivationQuote.upsert({
      where: { dayOfYear: day },
      update: { text: motivationalPhrases[day - 1] },
      create: {
        dayOfYear: day,
        text: motivationalPhrases[day - 1]
      }
    });
  }

  console.log('Seed completado.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
