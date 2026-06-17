'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, CreditCard, Pencil, Zap, TrendingDown, DollarSign } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { debtSchema, type DebtInput, paymentSchema, type PaymentInput } from '@/lib/validators';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { Input, Field, Btn } from '@/components/ui/field';

interface Debt {
  id: string; name: string; entity: string; balance: number;
  interestRate: number; minPayment: number; dueDate: string; createdAt: string;
}

type PayoffMethod = 'snowball' | 'avalanche';

interface PayoffStep {
  month: number;
  payments: { debtId: string; name: string; amount: number; remainingBalance: number }[];
  totalPaid: number;
  totalInterest: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function calcPayoffPlan(debts: Debt[], extraPayment: number, method: PayoffMethod): {
  months: number; totalInterest: number; order: string[]; monthlyData: PayoffStep[];
} {
  if (debts.length === 0) return { months: 0, totalInterest: 0, order: [], monthlyData: [] };

  const sorted = [...debts].sort((a, b) =>
    method === 'snowball' ? a.balance - b.balance : b.interestRate - a.interestRate
  );

  const balances = Object.fromEntries(sorted.map((d) => [d.id, d.balance]));
  let totalInterest = 0;
  let month = 0;
  const order: string[] = [];
  const monthlyData: PayoffStep[] = [];
  const minPayments = Object.fromEntries(sorted.map((d) => [d.id, d.minPayment]));
  let extra = extraPayment;

  while (Object.values(balances).some((b) => b > 0) && month < 600) {
    month++;
    let monthInterest = 0;
    let monthPaid = 0;
    const stepPayments: PayoffStep['payments'] = [];

    // Accrue monthly interest
    for (const debt of sorted) {
      if (balances[debt.id] <= 0) continue;
      const interest = (balances[debt.id] * (debt.interestRate / 100)) / 12;
      balances[debt.id] += interest;
      monthInterest += interest;
    }

    // Pay minimums first
    for (const debt of sorted) {
      if (balances[debt.id] <= 0) continue;
      const pay = Math.min(minPayments[debt.id], balances[debt.id]);
      balances[debt.id] -= pay;
      monthPaid += pay;
    }

    // Apply extra to first non-zero debt in sorted order
    let remainingExtra = extra;
    for (const debt of sorted) {
      if (balances[debt.id] <= 0) continue;
      if (remainingExtra <= 0) break;
      const pay = Math.min(remainingExtra, balances[debt.id]);
      balances[debt.id] -= pay;
      remainingExtra -= pay;
      monthPaid += pay;
    }

    // Check paid off
    for (const debt of sorted) {
      if (balances[debt.id] <= 0 && !order.includes(debt.id)) {
        order.push(debt.id);
        minPayments[debt.id] = 0;
        // Roll freed minimum into extra for next focus debt
        extra += debt.minPayment;
      }
    }

    totalInterest += monthInterest;

    for (const debt of sorted) {
      stepPayments.push({
        debtId: debt.id,
        name: debt.name,
        amount: 0,
        remainingBalance: Math.max(0, balances[debt.id]),
      });
    }

    if (month <= 36) {
      monthlyData.push({ month, payments: stepPayments, totalPaid: monthPaid, totalInterest });
    }
  }

  return { months: month, totalInterest, order, monthlyData };
}

export default function DebtsPage() {
  const { user, isLoading } = useProtected();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Debt | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Debt | null>(null);
  const [payoffMethod, setPayoffMethod] = useState<PayoffMethod>('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);
  const [error, setError] = useState('');

  const { register: regDebt, handleSubmit: handleDebt, reset: resetDebt, formState: { errors: debtErrors, isSubmitting: debtSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<DebtInput>({ resolver: zodResolver(debtSchema) as any });

  const { register: regPayment, handleSubmit: handlePayment, reset: resetPayment, formState: { errors: payErrors, isSubmitting: paySubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<PaymentInput>({ resolver: zodResolver(paymentSchema) as any });

  async function loadData() {
    try {
      const res = await api.get<{ debts: Debt[] }>('/deudas');
      setDebts(res.debts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  function openAdd() {
    setEditTarget(null);
    resetDebt({ dueDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0] });
    setShowDebtModal(true);
  }

  function openEdit(debt: Debt) {
    setEditTarget(debt);
    resetDebt({
      name: debt.name, entity: debt.entity, balance: debt.balance,
      interestRate: debt.interestRate, minPayment: debt.minPayment,
      dueDate: new Date(debt.dueDate).toISOString().split('T')[0],
    });
    setShowDebtModal(true);
  }

  async function onSubmitDebt(data: DebtInput) {
    try {
      if (editTarget) {
        await api.put(`/deudas/${editTarget.id}`, data);
      } else {
        await api.post('/deudas', data);
      }
      setShowDebtModal(false);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta deuda y todos sus pagos?')) return;
    try {
      await api.delete(`/deudas/${id}`);
      setDebts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function openPayment(debt: Debt) {
    setPaymentTarget(debt);
    resetPayment({ debtId: debt.id, amount: debt.minPayment });
    setShowPaymentModal(true);
  }

  async function onSubmitPayment(data: PaymentInput) {
    try {
      await api.post('/pagos', data);
      setShowPaymentModal(false);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.minPayment, 0);

  const plan = calcPayoffPlan(debts, extraPayment, payoffMethod);
  const altPlan = calcPayoffPlan(debts, extraPayment, payoffMethod === 'avalanche' ? 'snowball' : 'avalanche');

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32">
      <TopBar title="Deudas" />
      <section className="pt-24 px-6 max-w-2xl mx-auto space-y-6">

        {error && (
          <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>
        )}

        {/* Summary */}
        <div className="glass-card rounded-[24px] p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">Deuda total</p>
              <h2 className="mt-2 text-3xl font-bold text-on-tertiary-container">{fmt(totalDebt)}</h2>
              <p className="text-sm text-on-surface-variant mt-1">Pago mínimo mensual: {fmt(totalMinPayment)}</p>
            </div>
            <div className="h-16 w-16 rounded-3xl bg-tertiary-container/20 flex items-center justify-center">
              <CreditCard size={28} className="text-on-tertiary-container" />
            </div>
          </div>
        </div>

        {/* Payoff Planner */}
        {debts.length > 0 && (
          <div className="glass-card rounded-[24px] p-6 shadow-card space-y-5">
            <h3 className="text-lg font-semibold text-primary">Planificador de Deudas</h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPayoffMethod('avalanche')}
                className={`flex flex-col gap-2 rounded-2xl p-4 text-left border-2 transition ${payoffMethod === 'avalanche' ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface-container-low'}`}
              >
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-on-tertiary-container" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Avalancha</span>
                </div>
                <p className="text-xs text-on-surface-variant">Mayor tasa primero. Ahorra más en intereses.</p>
              </button>
              <button
                onClick={() => setPayoffMethod('snowball')}
                className={`flex flex-col gap-2 rounded-2xl p-4 text-left border-2 transition ${payoffMethod === 'snowball' ? 'border-secondary bg-secondary/5' : 'border-outline-variant/30 bg-surface-container-low'}`}
              >
                <div className="flex items-center gap-2">
                  <TrendingDown size={16} className="text-secondary" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Bola de Nieve</span>
                </div>
                <p className="text-xs text-on-surface-variant">Menor saldo primero. Mayor motivación.</p>
              </button>
            </div>

            <Field label="Pago extra mensual (adicional al mínimo)">
              <Input
                type="number"
                min="0"
                value={extraPayment}
                onChange={(e) => setExtraPayment(Number(e.target.value))}
                placeholder="0"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-surface-container-low p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-on-surface-variant mb-1">
                  {payoffMethod === 'avalanche' ? 'Avalancha' : 'Bola de Nieve'}
                </p>
                <p className="text-2xl font-bold text-primary">{plan.months} meses</p>
                <p className="text-xs text-on-surface-variant mt-1">Intereses: {fmt(plan.totalInterest)}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-on-surface-variant mb-1">
                  {payoffMethod === 'avalanche' ? 'Bola de Nieve' : 'Avalancha'}
                </p>
                <p className="text-2xl font-bold text-on-surface-variant">{altPlan.months} meses</p>
                <p className="text-xs text-on-surface-variant mt-1">Intereses: {fmt(altPlan.totalInterest)}</p>
              </div>
            </div>

            {plan.months > 0 && (
              <div className="rounded-2xl bg-secondary/5 border border-secondary/20 p-4">
                <p className="text-sm font-medium text-secondary mb-2">
                  Con {payoffMethod === 'avalanche' ? 'Avalancha' : 'Bola de Nieve'} ahorras{' '}
                  <span className="font-bold">{fmt(Math.abs(altPlan.totalInterest - plan.totalInterest))}</span>{' '}
                  en intereses vs el método alternativo.
                </p>
                <p className="text-xs text-on-surface-variant">
                  Fecha estimada: {new Date(Date.now() + plan.months * 30 * 86400000).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white transition hover:opacity-90 shadow-card"
        >
          <Plus size={18} /> Agregar Deuda
        </button>

        {/* Debt list */}
        {debts.length === 0 ? (
          <div className="glass-card rounded-[24px] p-10 text-center shadow-card">
            <CreditCard size={40} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
            <p className="text-on-surface-variant text-sm">No tienes deudas registradas. ¡Excelente!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-primary px-1">Deudas Activas</h3>
            {debts.map((debt) => {
              const totalMinBalance = debts.reduce((s, d) => s + d.minPayment, 0);
              const debtShare = totalMinBalance > 0 ? (debt.minPayment / totalMinBalance) * 100 : 50;
              const progressRatio = Math.max(5, Math.min(95, debtShare));
              return (
                <div key={debt.id} className="glass-card rounded-[24px] p-5 shadow-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-on-surface">{debt.name}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{debt.entity}</p>
                      <p className="text-2xl font-bold text-on-tertiary-container mt-2">{fmt(debt.balance)}</p>
                    </div>
                    <div className="text-right text-sm text-on-surface-variant space-y-1">
                      <p className="font-semibold text-on-surface">{debt.interestRate}% E.A.</p>
                      <p>Mín: {fmt(debt.minPayment)}</p>
                      <p className="text-xs">{new Date(debt.dueDate).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${progressRatio}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={() => openPayment(debt)}
                      className="flex items-center gap-1.5 rounded-xl bg-secondary/10 text-secondary px-3 py-2 text-xs font-semibold hover:bg-secondary/20 transition"
                    >
                      <DollarSign size={13} /> Registrar pago
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(debt)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition text-on-surface-variant">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(debt.id)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Debt Modal */}
      {showDebtModal && (
        <Modal title={editTarget ? 'Editar Deuda' : 'Nueva Deuda'} subtitle="Registra una deuda o crédito activo" onClose={() => setShowDebtModal(false)}>
          <form onSubmit={handleDebt(onSubmitDebt)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" error={debtErrors.name?.message} required>
                <Input {...regDebt('name')} placeholder="ej. Crédito libre" />
              </Field>
              <Field label="Entidad" error={debtErrors.entity?.message} required>
                <Input {...regDebt('entity')} placeholder="ej. Bancolombia" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Saldo pendiente" error={debtErrors.balance?.message} required>
                <Input {...regDebt('balance', { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" />
              </Field>
              <Field label="Tasa interés (%)" error={debtErrors.interestRate?.message} required>
                <Input {...regDebt('interestRate', { valueAsNumber: true })} type="number" step="0.01" placeholder="ej. 18.5" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pago mínimo" error={debtErrors.minPayment?.message} required>
                <Input {...regDebt('minPayment', { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" />
              </Field>
              <Field label="Fecha final" error={debtErrors.dueDate?.message} required>
                <Input {...regDebt('dueDate')} type="date" />
              </Field>
            </div>

            <Btn type="submit" variant="primary" loading={debtSubmitting} className="w-full mt-2">
              {editTarget ? 'Guardar cambios' : 'Agregar deuda'}
            </Btn>
          </form>
        </Modal>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentTarget && (
        <Modal title={`Pago a ${paymentTarget.name}`} subtitle="El saldo se reducirá automáticamente" onClose={() => setShowPaymentModal(false)}>
          <form onSubmit={handlePayment(onSubmitPayment)} className="space-y-4">
            <div className="rounded-2xl bg-surface-container-low p-4 space-y-1">
              <p className="text-xs text-on-surface-variant">Saldo actual</p>
              <p className="text-2xl font-bold text-on-tertiary-container">{fmt(paymentTarget.balance)}</p>
              <p className="text-xs text-on-surface-variant">Pago mínimo: {fmt(paymentTarget.minPayment)}</p>
            </div>

            <input type="hidden" {...regPayment('debtId')} value={paymentTarget.id} />

            <Field label="Monto del pago" error={payErrors.amount?.message} required>
              <Input {...regPayment('amount', { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" />
            </Field>

            <Btn type="submit" variant="secondary" loading={paySubmitting} className="w-full mt-2">
              Registrar pago
            </Btn>
          </form>
        </Modal>
      )}

      <BottomNav />
    </main>
  );
}
