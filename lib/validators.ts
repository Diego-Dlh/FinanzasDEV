import { z } from 'zod';

export const registerSchema = z.object({
  name:            z.string().min(2, 'El nombre es requerido'),
  email:           z.string().email('Correo inválido'),
  password:        z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  registrationKey: z.string().min(1, 'El código de acceso es requerido'),
});

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const frequencyEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME']);

export const incomeSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  amount: z.number().positive('El monto debe ser positivo'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  accountId: z.string().min(1, 'La cuenta es requerida'),
  date: z.string().min(1, 'La fecha es requerida'),
  frequency: frequencyEnum,
});

export const expenseSchema = z.object({
  description: z.string().min(2, 'La descripción es requerida'),
  amount: z.number().positive('El monto debe ser positivo'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  accountId: z.string().min(1, 'La cuenta es requerida'),
  date: z.string().min(1, 'La fecha es requerida'),
  frequency: frequencyEnum,
});

export const debtSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  entity: z.string().min(2, 'La entidad es requerida'),
  balance: z.number().positive('El saldo debe ser positivo'),
  interestRate: z.number().min(0, 'Tasa inválida').max(100, 'Tasa inválida'),
  minPayment: z.number().positive('El pago mínimo debe ser positivo'),
  dueDate: z.string().min(1, 'La fecha es requerida'),
});

export const budgetSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  allocated: z.number().positive('El monto debe ser positivo'),
});

export const goalSchema = z.object({
  title: z.string().min(2, 'El título es requerido'),
  description: z.string().min(2, 'La descripción es requerida'),
  targetAmount: z.number().positive('El monto objetivo debe ser positivo'),
  currentAmount: z.number().min(0, 'El monto actual debe ser >= 0').default(0),
  targetDate: z.string().min(1, 'La fecha es requerida'),
});

export const paymentSchema = z.object({
  debtId:    z.string().min(1, 'La deuda es requerida'),
  amount:    z.number().positive('El monto debe ser positivo'),
  accountId: z.string().optional(),
});

export const creditCardSchema = z.object({
  name:         z.string().min(2, 'El nombre es requerido'),
  bank:         z.string().min(2, 'El banco es requerido'),
  creditLimit:  z.number().positive('El cupo debe ser positivo'),
  interestRate: z.number().positive('La tasa debe ser positiva'),
  dueDay:       z.number().int().min(1, 'Día inválido').max(31, 'Día inválido'),
  cutDay:       z.number().int().min(1, 'Día inválido').max(31, 'Día inválido'),
  currency:     z.string().default('COP'),
});

export const cardPurchaseSchema = z.object({
  description:  z.string().min(2, 'La descripción es requerida'),
  categoryId:   z.string().min(1, 'La categoría es requerida'),
  totalAmount:  z.number().positive('El monto debe ser positivo'),
  installments: z.number().int().min(1, 'Mínimo 1 cuota').max(48, 'Máximo 48 cuotas'),
  date:         z.string().min(1, 'La fecha es requerida'),
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
  amount:    z.number().positive('El monto debe ser positivo'),
  note:      z.string().optional(),
  paidAt:    z.string().min(1, 'La fecha es requerida'),
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
