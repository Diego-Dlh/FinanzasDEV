import { z } from 'zod';
import { dateOnlyToUTC } from './dates';

// 'YYYY-MM-DD' that is a real calendar day (rejects 2026-02-31, 'abc', '')
const calendarDate = z
  .string()
  .min(1, 'La fecha es requerida')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .refine((s) => {
    const d = dateOnlyToUTC(s);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Fecha inválida');

// Emails are matched case-insensitively: stored and compared trimmed + lowercase
const email = z.string().trim().toLowerCase().email('Correo inválido');

export const registerSchema = z.object({
  name:            z.string().min(2, 'El nombre es requerido'),
  email:           email,
  password:        z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  registrationKey: z.string().min(1, 'El código de acceso es requerido'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es requerida'),
});

const frequencyEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME']);

export const incomeSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  amount: z.number({ error: 'Ingresa un número válido' }).positive('El monto debe ser positivo'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  accountId: z.string().min(1, 'La cuenta es requerida'),
  date: calendarDate,
  frequency: frequencyEnum,
});

export const expenseSchema = z.object({
  description: z.string().min(2, 'La descripción es requerida'),
  amount: z.number({ error: 'Ingresa un número válido' }).positive('El monto debe ser positivo'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  accountId: z.string().min(1, 'La cuenta es requerida'),
  date: calendarDate,
  frequency: frequencyEnum,
});

export const debtSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  entity: z.string().min(2, 'La entidad es requerida'),
  balance: z.number({ error: 'Ingresa un número válido' }).positive('El saldo debe ser positivo'),
  interestRate: z.number({ error: 'Ingresa un número válido' }).min(0, 'Tasa inválida').max(100, 'Tasa inválida'),
  minPayment: z.number({ error: 'Ingresa un número válido' }).positive('El pago mínimo debe ser positivo'),
  dueDate: calendarDate,
});

// Editing may bring a debt to 0 (paid off); creating one with no balance makes no sense
export const debtUpdateSchema = debtSchema.partial().extend({
  balance: z.number({ error: 'Ingresa un número válido' }).min(0, 'El saldo no puede ser negativo').optional(),
});

export const budgetSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  allocated: z.number({ error: 'Ingresa un número válido' }).positive('El monto debe ser positivo'),
  categoryId: z.string().min(1, 'Elige la categoría del presupuesto'),
});

const goalFields = {
  title: z.string().min(2, 'El título es requerido'),
  description: z.string().min(2, 'La descripción es requerida'),
  targetAmount: z.number({ error: 'Ingresa un número válido' }).positive('El monto objetivo debe ser positivo'),
  currentAmount: z.number({ error: 'Ingresa un número válido' }).min(0, 'El monto actual debe ser >= 0'),
  targetDate: calendarDate,
};

export const goalSchema = z.object({
  ...goalFields,
  currentAmount: goalFields.currentAmount.default(0),
});

// No defaults here: zod 4 applies them inside .partial(), which would reset
// currentAmount to 0 whenever a PUT doesn't send it.
export const goalUpdateSchema = z.object(goalFields).partial();

export const paymentSchema = z.object({
  debtId:    z.string().min(1, 'La deuda es requerida'),
  amount:    z.number({ error: 'Ingresa un número válido' }).positive('El monto debe ser positivo'),
  accountId: z.string().optional(),
});

export const creditCardSchema = z.object({
  name:         z.string().min(2, 'El nombre es requerido'),
  bank:         z.string().min(2, 'El banco es requerido'),
  creditLimit:  z.number({ error: 'Ingresa un número válido' }).positive('El cupo debe ser positivo'),
  interestRate: z.number({ error: 'Ingresa un número válido' }).positive('La tasa debe ser positiva'),
  dueDay:       z.number({ error: 'Ingresa un número válido' }).int().min(1, 'Día inválido').max(31, 'Día inválido'),
  cutDay:       z.number({ error: 'Ingresa un número válido' }).int().min(1, 'Día inválido').max(31, 'Día inválido'),
  currency:     z.string().default('COP'),
});

export const cardPurchaseSchema = z.object({
  description:  z.string().min(2, 'La descripción es requerida'),
  categoryId:   z.string().min(1, 'La categoría es requerida'),
  totalAmount:  z.number({ error: 'Ingresa un número válido' }).positive('El monto debe ser positivo'),
  installments: z.number({ error: 'Ingresa un número válido' }).int().min(1, 'Mínimo 1 cuota').max(48, 'Máximo 48 cuotas'),
  date:         calendarDate,
});

export type RegisterInput    = z.infer<typeof registerSchema>;
export type LoginInput       = z.infer<typeof loginSchema>;
export type IncomeInput      = z.infer<typeof incomeSchema>;
export type ExpenseInput     = z.infer<typeof expenseSchema>;
export type DebtInput        = z.infer<typeof debtSchema>;
export type BudgetInput      = z.infer<typeof budgetSchema>;
export type GoalInput        = z.infer<typeof goalSchema>;
export type PaymentInput     = z.infer<typeof paymentSchema>;
export const cardPaymentSchema = z.object({
  amount:    z.number({ error: 'Ingresa un número válido' }).positive('El monto debe ser positivo'),
  note:      z.string().optional(),
  paidAt:    calendarDate,
  accountId: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
  newPassword:     z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export type CreditCardInput      = z.infer<typeof creditCardSchema>;
export type CardPurchaseInput    = z.infer<typeof cardPurchaseSchema>;
export type CardPaymentInput     = z.infer<typeof cardPaymentSchema>;
export type ChangePasswordInput   = z.infer<typeof changePasswordSchema>;

const accountTypeEnum = z.enum(['CASH', 'BANK', 'NEQUI', 'DAVIPLATA', 'CARD'], { error: 'Tipo de cuenta inválido' });
const accountName = z.string().trim().min(1, 'El nombre es requerido').max(60, 'El nombre es demasiado largo');
const currencyCode = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Moneda inválida');
const balanceAmount = z.number({ error: 'El saldo debe ser un número' }).finite('El saldo debe ser un número');

export const accountSchema = z.object({
  name: accountName,
  type: accountTypeEnum,
  balance: balanceAmount.default(0),
  currency: currencyCode.default('COP'),
});

// PUT /api/cuentas/[id]: only the fields sent are changed
export const accountUpdateSchema = z.object({
  name: accountName,
  balance: balanceAmount,
  currency: currencyCode,
  hideFromTotal: z.boolean({ error: 'hideFromTotal debe ser verdadero o falso' }),
}).partial();

// Admin edits: full replacement of the editable fields
export const adminAccountUpdateSchema = z.object({
  name: accountName,
  type: accountTypeEnum,
  balance: balanceAmount,
  currency: currencyCode.default('COP'),
});

export const adminAccountCreateSchema = adminAccountUpdateSchema.extend({
  userId: z.string().min(1, 'userId requerido'),
  balance: balanceAmount.default(0),
});

// POST /api/auth/cambiar-password (the confirm-password field is checked on the client)
export const changePasswordApiSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});
