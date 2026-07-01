'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, CreditCard, Pencil, DollarSign, Calculator, ChevronRight } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { debtSchema, type DebtInput, paymentSchema, type PaymentInput } from '@/lib/validators';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { Input, SelectField, Field, Btn } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

interface Debt {
  id: string; name: string; entity: string; balance: number;
  interestRate: number; minPayment: number; dueDate: string; createdAt: string;
}
interface CardDebt { id: string; name: string; bank: string; usedBalance: number }
interface Account { id: string; name: string; type: string; balance: number }

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

export default function DebtsPage() {
  const { user, isLoading } = useProtected();
  const router = useRouter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [cards, setCards] = useState<CardDebt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Debt | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Debt | null>(null);
  const [deleteDebtTarget, setDeleteDebtTarget] = useState<Debt | null>(null);
  const [payError, setPayError] = useState('');
  const [error, setError] = useState('');

  // Calculator state
  const [calcMonto, setCalcMonto] = useState('');
  const [calcTasa, setCalcTasa] = useState('');
  const [calcMeses, setCalcMeses] = useState('');
  const [calcTipoTasa, setCalcTipoTasa] = useState<'mensual' | 'anual'>('anual');

  const { register: regDebt, handleSubmit: handleDebt, reset: resetDebt, formState: { errors: debtErrors, isSubmitting: debtSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<DebtInput>({ resolver: zodResolver(debtSchema) as any });

  const { register: regPayment, handleSubmit: handlePayment, reset: resetPayment, watch: watchPayment, formState: { errors: payErrors, isSubmitting: paySubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<PaymentInput>({ resolver: zodResolver(paymentSchema) as any });

  const toast = useToast();
  const selectedAccountId = watchPayment('accountId');
  const paymentAmount = watchPayment('amount');
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  async function loadData() {
    try {
      const [debtsRes, cardsRes, accountsRes] = await Promise.all([
        api.get<{ debts: Debt[] }>('/deudas'),
        api.get<{ cards: CardDebt[] }>('/tarjetas'),
        api.get<{ accounts: Account[] }>('/cuentas'),
      ]);
      setDebts(debtsRes.debts);
      setCards(cardsRes.cards);
      setAccounts(accountsRes.accounts);
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
    setError('');
    try {
      if (editTarget) {
        await api.put(`/deudas/${editTarget.id}`, data);
        toast.success('Deuda actualizada');
      } else {
        await api.post('/deudas', data);
        toast.success('Deuda registrada');
      }
      setShowDebtModal(false);
      await loadData();
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  function handleDelete(id: string) {
    const debt = debts.find((d) => d.id === id);
    if (debt) setDeleteDebtTarget(debt);
  }

  async function confirmDebtAction(modo: 'cerrar' | 'eliminar') {
    if (!deleteDebtTarget) return;
    const id = deleteDebtTarget.id;
    setDeleteDebtTarget(null);
    setError('');
    try {
      const qs = modo === 'cerrar' ? '?modo=cerrar' : '';
      await api.delete(`/deudas/${id}${qs}`);
      setDebts((prev) => prev.filter((d) => d.id !== id));
      toast.success(modo === 'cerrar' ? 'Deuda cerrada' : 'Deuda eliminada');
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  function openPayment(debt: Debt) {
    setPaymentTarget(debt);
    setPayError('');
    resetPayment({ debtId: debt.id, amount: debt.minPayment, accountId: '' });
    setShowPaymentModal(true);
  }

  async function onSubmitPayment(data: PaymentInput) {
    setPayError('');
    if (!paymentTarget) return;

    if (data.amount > paymentTarget.balance) {
      setPayError(`No puedes pagar más del saldo de la deuda (${fmt(paymentTarget.balance)})`);
      return;
    }
    if (data.accountId && selectedAccount && data.amount > selectedAccount.balance) {
      setPayError(`Saldo insuficiente en la cuenta seleccionada (${fmt(selectedAccount.balance)} disponibles)`);
      return;
    }

    try {
      await api.post('/pagos', {
        ...data,
        accountId: data.accountId || undefined,
      });
      setShowPaymentModal(false);
      toast.success('Pago registrado');
      await loadData();
    } catch (e) {
      setPayError((e as Error).message);
    }
  }

  // Calculator logic
  const calcResult = useMemo(() => {
    const P = parseFloat(calcMonto);
    const tasaRaw = parseFloat(calcTasa);
    const n = parseInt(calcMeses);
    if (!P || !tasaRaw || !n || P <= 0 || tasaRaw <= 0 || n <= 0) return null;
    const r = calcTipoTasa === 'anual' ? tasaRaw / 100 / 12 : tasaRaw / 100;
    const cuota = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPagar = cuota * n;
    const totalIntereses = totalPagar - P;
    return { cuota, totalPagar, totalIntereses };
  }, [calcMonto, calcTasa, calcMeses, calcTipoTasa]);

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  const totalDebtRegular = debts.reduce((s, d) => s + d.balance, 0);
  const totalDebtCards = cards.reduce((s, c) => s + c.usedBalance, 0);
  const grandTotal = totalDebtRegular + totalDebtCards;
  const totalMinPayment = debts.reduce((s, d) => s + d.minPayment, 0);

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
      <TopBar title="Deudas" />
      <section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">

        {error && (
          <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>
        )}

        {/* Summary */}
        <div className="glass-card rounded-[24px] p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">Deuda total</p>
              <h2 className="mt-2 text-3xl font-bold text-on-tertiary-container">{fmt(grandTotal)}</h2>
              <p className="text-sm text-on-surface-variant mt-1">Pago mínimo mensual deudas: {fmt(totalMinPayment)}</p>
            </div>
            <div className="h-16 w-16 rounded-3xl bg-tertiary-container/20 flex items-center justify-center">
              <CreditCard size={28} className="text-on-tertiary-container" />
            </div>
          </div>
          {totalDebtCards > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
              <div className="rounded-xl bg-surface-container-low px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Deudas directas</p>
                <p className="text-sm font-semibold text-on-tertiary-container">{fmt(totalDebtRegular)}</p>
              </div>
              <div className="rounded-xl bg-surface-container-low px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Tarjetas de crédito</p>
                <p className="text-sm font-semibold text-primary">{fmt(totalDebtCards)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Debt Calculator */}
        <div className="glass-card rounded-[24px] p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-primary">Calculadora de Deudas</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto del crédito">
              <Input
                type="number"
                value={calcMonto}
                onChange={e => setCalcMonto(e.target.value)}
                placeholder="ej. 5000000"
              />
            </Field>
            <Field label="Plazo (meses)">
              <Input
                type="number"
                value={calcMeses}
                onChange={e => setCalcMeses(e.target.value)}
                placeholder="ej. 24"
                min="1"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-on-surface">Tasa de interés</p>
              <div className="flex rounded-xl overflow-hidden border border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setCalcTipoTasa('mensual')}
                  className={`px-3 py-1 text-xs font-semibold transition ${calcTipoTasa === 'mensual' ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setCalcTipoTasa('anual')}
                  className={`px-3 py-1 text-xs font-semibold transition ${calcTipoTasa === 'anual' ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}
                >
                  Anual (E.A.)
                </button>
              </div>
            </div>
            <Input
              type="number"
              value={calcTasa}
              onChange={e => setCalcTasa(e.target.value)}
              placeholder={calcTipoTasa === 'anual' ? 'ej. 18.5 % anual' : 'ej. 2.5 % mensual'}
              step="0.01"
            />
          </div>

          {calcResult ? (
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-outline-variant/20">
              <div className="rounded-2xl bg-surface-container-low p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Cuota mensual</p>
                <p className="text-sm font-bold text-primary">{fmt(calcResult.cuota)}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Total a pagar</p>
                <p className="text-sm font-bold text-on-surface">{fmt(calcResult.totalPagar)}</p>
              </div>
              <div className="rounded-2xl bg-error/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">En intereses</p>
                <p className="text-sm font-bold text-error">{fmt(calcResult.totalIntereses)}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant text-center py-2">
              Completa los campos para ver el resultado
            </p>
          )}
        </div>

        {/* Add debt button */}
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white transition hover:opacity-90 shadow-card"
        >
          <Plus size={18} /> Agregar Deuda
        </button>

        {/* Regular debts */}
        {debts.length === 0 && cards.length === 0 ? (
          <div className="glass-card rounded-[24px] p-10 text-center shadow-card">
            <CreditCard size={40} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
            <p className="text-on-surface-variant text-sm">No tienes deudas registradas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {debts.length > 0 && (
              <>
                <h3 className="text-base font-semibold text-primary px-1">Deudas Activas</h3>
                {debts.map((debt) => (
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
                    <div className="flex items-center justify-between mt-4">
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
                ))}
              </>
            )}

            {/* Credit card debts */}
            {cards.length > 0 && (
              <>
                <h3 className="text-base font-semibold text-primary px-1">Tarjetas de Crédito</h3>
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => router.push('/tarjetas')}
                    className="w-full glass-card rounded-[24px] p-5 shadow-card flex items-center justify-between gap-4 hover:shadow-md transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CreditCard size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface text-sm">{card.name}</p>
                        <p className="text-xs text-on-surface-variant">{card.bank}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-base font-bold text-primary">{fmt(card.usedBalance)}</p>
                      <ChevronRight size={16} className="text-on-surface-variant" />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* Delete debt confirmation modal */}
      {deleteDebtTarget && (
        <Modal
          title="¿Qué deseas hacer?"
          subtitle={`Deuda: ${deleteDebtTarget.name} · ${deleteDebtTarget.entity}`}
          onClose={() => setDeleteDebtTarget(null)}
        >
          <div className="space-y-3">
            <div className="rounded-2xl bg-surface-container-low p-4 space-y-3">
              <div>
                <p className="font-semibold text-sm text-on-surface">Cerrar deuda</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Marca la deuda como saldada o cancelada. Los pagos realizados
                  permanecen en tu historial — no se revierten los movimientos de tus cuentas.
                </p>
              </div>
              <Btn variant="secondary" className="w-full" onClick={() => confirmDebtAction('cerrar')}>
                Cerrar deuda
              </Btn>
            </div>
            <div className="rounded-2xl bg-error-container/40 p-4 space-y-3">
              <div>
                <p className="font-semibold text-sm text-error">Eliminar registro</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Borra la deuda como si nunca hubiera existido. Todos los pagos
                  se revierten y el dinero vuelve a tus cuentas.
                </p>
              </div>
              <Btn variant="danger" className="w-full" onClick={() => confirmDebtAction('eliminar')}>
                Eliminar y revertir todo
              </Btn>
            </div>
          </div>
        </Modal>
      )}

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
              <Field label="Tasa interés (% E.A.)" error={debtErrors.interestRate?.message} required>
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
              <p className="text-xs text-on-surface-variant">Saldo de la deuda</p>
              <p className="text-2xl font-bold text-on-tertiary-container">{fmt(paymentTarget.balance)}</p>
              <p className="text-xs text-on-surface-variant">Pago mínimo: {fmt(paymentTarget.minPayment)}</p>
            </div>

            <input type="hidden" {...regPayment('debtId')} value={paymentTarget.id} />

            <Field label="Monto del pago" error={payErrors.amount?.message} required>
              <Input {...regPayment('amount', { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" />
            </Field>

            {accounts.length > 0 && (
              <Field label="Descontar de cuenta (opcional)">
                <SelectField {...regPayment('accountId')}>
                  <option value="">— Sin descontar de cuenta —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {fmt(a.balance)}
                    </option>
                  ))}
                </SelectField>
              </Field>
            )}

            {selectedAccount && paymentAmount > 0 && (
              <div className={`rounded-xl px-3 py-2 text-xs ${paymentAmount > selectedAccount.balance ? 'bg-error-container text-on-error-container' : 'bg-secondary/10 text-secondary'}`}>
                {paymentAmount > selectedAccount.balance
                  ? `Saldo insuficiente: la cuenta tiene ${fmt(selectedAccount.balance)}`
                  : `Quedarán ${fmt(selectedAccount.balance - paymentAmount)} en la cuenta`
                }
              </div>
            )}

            {payError && (
              <div className="rounded-xl bg-error-container px-3 py-2 text-xs text-on-error-container">{payError}</div>
            )}

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
