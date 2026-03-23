import { z } from 'zod';

export const accessRequestSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  email: z.string().email('El correo electronico no es valido.'),
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres.'),
  financialLevel: z.enum(['principiante', 'intermedio', 'avanzado', 'beginner', 'intermediate', 'advanced'])
});

export const registerSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(8)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        return Number(value.replace(',', '.'));
      }
      return value;
    },
    z.number().positive()
  ),
  category: z.string().trim().optional().nullable(),
  date: z.string(),
  description: z.string().max(180).optional().nullable()
}).superRefine((data, ctx) => {
  if (data.type === 'expense' && (!data.category || data.category.length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category'],
      message: 'La categoria es obligatoria para gastos.'
    });
  }
});

export const goalSchema = z.object({
  title: z.string().min(2),
  targetAmount: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        return Number(value.replace(',', '.'));
      }
      return value;
    },
    z.number().positive()
  ),
  currentAmount: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        return Number(value.replace(',', '.'));
      }
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      return value;
    },
    z.number().min(0)
  ).default(0),
  deadline: z.string()
});
