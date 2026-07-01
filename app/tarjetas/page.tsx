'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Plus, Trash2, Pencil, ChevronLeft, ShoppingCart, Wallet } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { creditCardSchema, cardPurchaseSchema, cardPaymentSchema, type CreditCardInput, type CardPurchaseInput, type CardPaymentInput } from '@/lib/validators';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { Input, SelectField, Field, Btn } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

interface Category { id: string; name: string; type: string }
interface Account { id: string; name: string; type: string; balance: number }

interface CardPurchase {
  id: string;
  cardId: string;
  categoryId: string;
  description: string;
  totalAmount: number;
  installments: number;
  installmentAmt: number;
  paidInstallments: number;
  date: string;
  category: { id: string; name: string };
}

interface CardPayment {
  id: string;
  cardId: string;
  amount: number;
  note: string | null;
  paidAt: string;
}

interface CreditCardData {
  id: string;
  name: string;
  bank: string;
  creditLimit: number;
  usedBalance: number;
  interestRate: number;
  dueDay: number;
  cutDay: number;
  currency: string;
  purchases: CardPurchase[];
  payments: CardPayment[];
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function calcMinPayment(card: CreditCardData) {
  const active = card.purchases.filter((p) => p.paidInstallments < p.installments);
  const cuotasMes = active.reduce((s, p) => s + p.installmentAmt, 0);
  const interesMes = card.usedBalance * (card.interestRate / 100);
  const minPayment = Math.max(card.usedBalance * 0.05, cuotasMes + interesMes);
  return { cuotasMes, interesMes, minPayment };
}

export default function TarjetasPage() {
  const { user, isLoading } = useProtected();
  const [cards, setCards] = useState<CreditCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const toast = useToast();
  const [abonoError, setAbonoError] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [showCardModal, setShowCardModal] = useState(false);
  const [editCard, setEditCard] = useState<CreditCardData | null>(null);

  const [selectedCard, setSelectedCard] = useState<CreditCardData | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [deleteCardTarget, setDeleteCardTarget] = useState<CreditCardData | null>(null);

  const [purchasePreview, setPurchasePreview] = useState<number | null>(null);

  const cardForm = useForm<CreditCardInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(creditCardSchema) as any,
  });
  const purchaseForm = useForm<CardPurchaseInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(cardPurchaseSchema) as any,
  });
  const abonoForm = useForm<CardPaymentInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(cardPaymentSchema) as any,
  });

  async function loadData() {
    try {
      const [cardsRes, catRes, accRes] = await Promise.all([
        api.get<{ cards: CreditCardData[] }>('/tarjetas'),
        api.get<{ categories: Category[] }>('/categorias'),
        api.get<{ accounts: Account[] }>('/cuentas'),
      ]);
      setCards(cardsRes.cards);
      setCategories(catRes.categories.filter((c) => c.type === 'EXPENSE'));
      setAccounts(accRes.accounts);
      if (selectedCard) {
        const updated = cardsRes.cards.find((c) => c.id === selectedCard.id);
        if (updated) setSelectedCard(updated);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  function openAddCard() {
    setEditCard(null);
    cardForm.reset({ currency: 'COP' });
    setShowCardModal(true);
  }

  function openEditCard(card: CreditCardData) {
    setEditCard(card);
    cardForm.reset({
      name: card.name,
      bank: card.bank,
      creditLimit: card.creditLimit,
      interestRate: card.interestRate,
      dueDay: card.dueDay,
      cutDay: card.cutDay,
      currency: card.currency,
    });
    setShowCardModal(true);
  }

  async function onCardSubmit(data: CreditCardInput) {
    setError('');
    try {
      if (editCard) {
        await api.put(`/tarjetas/${editCard.id}`, data);
        toast.success('Tarjeta actualizada');
      } else {
        await api.post('/tarjetas', data);
        toast.success('Tarjeta agregada');
      }
      setShowCardModal(false);
      await loadData();
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  function handleDeleteCard(id: string) {
    const card = cards.find((c) => c.id === id) ?? selectedCard;
    if (card) setDeleteCardTarget(card);
  }

  async function confirmCardAction(modo: 'cerrar' | 'eliminar') {
    if (!deleteCardTarget) return;
    const id = deleteCardTarget.id;
    setDeleteCardTarget(null);
    setError('');
    try {
      const qs = modo === 'cerrar' ? '?modo=cerrar' : '';
      await api.delete(`/tarjetas/${id}${qs}`);
      if (selectedCard?.id === id) setSelectedCard(null);
      toast.success(modo === 'cerrar' ? 'Tarjeta cancelada' : 'Tarjeta eliminada');
      await loadData();
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  function openPurchaseModal() {
    setPurchasePreview(null);
    purchaseForm.reset({ date: new Date().toISOString().split('T')[0], installments: 1 });
    setShowPurchaseModal(true);
  }

  function onPurchaseChange() {
    const vals = purchaseForm.getValues();
    const total = Number(vals.totalAmount);
    const inst = Number(vals.installments) || 1;
    if (total > 0 && inst >= 1) setPurchasePreview(total / inst);
    else setPurchasePreview(null);
  }

  async function onPurchaseSubmit(data: CardPurchaseInput) {
    if (!selectedCard) return;
    try {
      await api.post(`/tarjetas/${selectedCard.id}/compras`, data);
      setShowPurchaseModal(false);
      toast.success('Compra registrada');
      await loadData();
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  async function handleDeletePurchase(purchaseId: string) {
    if (!selectedCard) return;
    if (!confirm('¿Eliminar esta compra?')) return;
    try {
      await api.delete(`/tarjetas/${selectedCard.id}/compras/${purchaseId}`);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function openAbonoModal() {
    const { minPayment } = calcMinPayment(selectedCard!);
    setAbonoError('');
    abonoForm.reset({
      amount: Math.round(minPayment),
      note: '',
      paidAt: new Date().toISOString().split('T')[0],
      accountId: '',
    });
    setShowAbonoModal(true);
  }

  async function onAbonoSubmit(data: CardPaymentInput) {
    if (!selectedCard) return;
    setAbonoError('');

    if (data.amount > selectedCard.usedBalance) {
      setAbonoError(`El abono no puede superar el saldo de la tarjeta (${fmt(selectedCard.usedBalance)})`);
      return;
    }
    const selectedAcc = accounts.find(a => a.id === data.accountId);
    if (selectedAcc && data.amount > selectedAcc.balance) {
      setAbonoError(`Saldo insuficiente en la cuenta seleccionada (${fmt(selectedAcc.balance)} disponibles)`);
      return;
    }

    try {
      await api.post(`/tarjetas/${selectedCard.id}/abonos`, {
        ...data,
        accountId: data.accountId || undefined,
      });
      setShowAbonoModal(false);
      toast.success('Abono registrado');
      await loadData();
    } catch (e) {
      setAbonoError((e as Error).message);
    }
  }

  async function handleDeleteAbono(paymentId: string) {
    if (!selectedCard) return;
    if (!confirm('¿Eliminar este abono? Se restaurará el saldo.')) return;
    try {
      await api.delete(`/tarjetas/${selectedCard.id}/abonos/${paymentId}`);
      toast.success('Abono eliminado');
      await loadData();
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  const totalUsed = cards.reduce((s, c) => s + c.usedBalance, 0);
  const totalLimit = cards.reduce((s, c) => s + c.creditLimit, 0);

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
      <TopBar title="Tarjetas" />
      <section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">

        {error && (
          <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>
        )}

        {/* ── Detail view ─────────────────────────────────────────────────── */}
        {selectedCard ? (
          <CardDetail
            card={selectedCard}
            categories={categories}
            onBack={() => setSelectedCard(null)}
            onEdit={() => openEditCard(selectedCard)}
            onDelete={() => handleDeleteCard(selectedCard.id)}
            onAddPurchase={openPurchaseModal}
            onDeletePurchase={handleDeletePurchase}
            onAddAbono={openAbonoModal}
            onDeleteAbono={handleDeleteAbono}
          />
        ) : (
          <>
            {/* ── Summary ─────────────────────────────────────────────────── */}
            <div className="glass-card rounded-[24px] p-6 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">Saldo usado</p>
                  <h2 className="mt-2 text-3xl font-bold text-primary">{fmt(totalUsed)}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Cupo total: {fmt(totalLimit)} · {cards.length} tarjeta{cards.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <CreditCard size={28} className="text-primary" />
                </div>
              </div>
            </div>

            {/* ── Add button ──────────────────────────────────────────────── */}
            <div className="flex justify-end">
              <Btn variant="primary" size="md" icon={<Plus size={16} />} onClick={openAddCard}>
                Nueva Tarjeta
              </Btn>
            </div>

            {/* ── Card list ───────────────────────────────────────────────── */}
            {cards.length === 0 ? (
              <div className="glass-card rounded-[24px] p-10 text-center shadow-card">
                <CreditCard size={40} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
                <p className="text-on-surface-variant text-sm">No tienes tarjetas registradas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((card) => (
                  <CardSummaryItem
                    key={card.id}
                    card={card}
                    onClick={() => setSelectedCard(card)}
                    onEdit={() => openEditCard(card)}
                    onDelete={() => handleDeleteCard(card.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Card modal ──────────────────────────────────────────────────────── */}
      {showCardModal && (
        <Modal
          title={editCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
          subtitle={editCard ? 'Modifica los datos de la tarjeta' : 'Agrega una tarjeta de crédito'}
          onClose={() => setShowCardModal(false)}
        >
          <form onSubmit={cardForm.handleSubmit(onCardSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" error={cardForm.formState.errors.name?.message} required>
                <Input {...cardForm.register('name')} placeholder="ej. Visa Platinum" />
              </Field>
              <Field label="Banco" error={cardForm.formState.errors.bank?.message} required>
                <Input {...cardForm.register('bank')} placeholder="ej. Bancolombia" />
              </Field>
            </div>

            <Field label="Cupo total" error={cardForm.formState.errors.creditLimit?.message} required>
              <Input
                {...cardForm.register('creditLimit', { valueAsNumber: true })}
                type="number"
                step="any"
                min={0}
                placeholder="0"
              />
            </Field>

            <Field label="Tasa efectiva mensual (%)" error={cardForm.formState.errors.interestRate?.message} required>
              <Input
                {...cardForm.register('interestRate', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="ej. 2.5"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Día de corte" error={cardForm.formState.errors.cutDay?.message} required>
                <Input
                  {...cardForm.register('cutDay', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={31}
                  placeholder="ej. 20"
                />
              </Field>
              <Field label="Día de vencimiento" error={cardForm.formState.errors.dueDay?.message} required>
                <Input
                  {...cardForm.register('dueDay', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={31}
                  placeholder="ej. 10"
                />
              </Field>
            </div>

            <Btn
              type="submit"
              variant="primary"
              loading={cardForm.formState.isSubmitting}
              className="w-full mt-2"
            >
              {editCard ? 'Guardar cambios' : 'Agregar tarjeta'}
            </Btn>
          </form>
        </Modal>
      )}

      {/* ── Delete card confirmation modal ─────────────────────────────────── */}
      {deleteCardTarget && (
        <Modal
          title="¿Qué deseas hacer?"
          subtitle={`Tarjeta: ${deleteCardTarget.name} · ${deleteCardTarget.bank}`}
          onClose={() => setDeleteCardTarget(null)}
        >
          <div className="space-y-3">
            <div className="rounded-2xl bg-surface-container-low p-4 space-y-3">
              <div>
                <p className="font-semibold text-sm text-on-surface">Cancelar tarjeta</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Cierra la tarjeta porque la cancelaste o la saldaste. Los abonos y pagos
                  realizados permanecen en tu historial — no se revierten los movimientos de tus cuentas.
                </p>
              </div>
              <Btn variant="secondary" className="w-full" onClick={() => confirmCardAction('cerrar')}>
                Cancelar tarjeta
              </Btn>
            </div>
            <div className="rounded-2xl bg-error-container/40 p-4 space-y-3">
              <div>
                <p className="font-semibold text-sm text-error">Eliminar registro</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Borra la tarjeta como si nunca hubiera existido. Todos los movimientos
                  asociados se revierten y el dinero vuelve a tus cuentas.
                </p>
              </div>
              <Btn variant="danger" className="w-full" onClick={() => confirmCardAction('eliminar')}>
                Eliminar y revertir todo
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Purchase modal ──────────────────────────────────────────────────── */}
      {showPurchaseModal && selectedCard && (
        <Modal
          title="Registrar Compra"
          subtitle={`Tarjeta: ${selectedCard.name}`}
          onClose={() => setShowPurchaseModal(false)}
        >
          <form
            onSubmit={purchaseForm.handleSubmit(onPurchaseSubmit)}
            onChange={onPurchaseChange}
            className="space-y-4"
          >
            <Field label="Descripción" error={purchaseForm.formState.errors.description?.message} required>
              <Input {...purchaseForm.register('description')} placeholder="ej. Compra en Falabella" />
            </Field>

            <Field label="Categoría" error={purchaseForm.formState.errors.categoryId?.message} required>
              <SelectField {...purchaseForm.register('categoryId')}>
                <option value="">Seleccionar...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectField>
            </Field>

            <Field label="Monto total" error={purchaseForm.formState.errors.totalAmount?.message} required>
              <Input
                {...purchaseForm.register('totalAmount', { valueAsNumber: true })}
                type="number"
                step="any"
                min={0}
                placeholder="0"
              />
            </Field>

            <Field label="Número de cuotas (1–48)" error={purchaseForm.formState.errors.installments?.message} required>
              <Input
                {...purchaseForm.register('installments', { valueAsNumber: true })}
                type="number"
                min={1}
                max={48}
                placeholder="1"
              />
            </Field>

            {purchasePreview !== null && (
              <div className="rounded-2xl bg-primary-container px-4 py-3 text-sm text-on-primary-container">
                Valor por cuota:{' '}
                <span className="font-semibold">{fmt(purchasePreview)}</span>
              </div>
            )}

            <Field label="Fecha" error={purchaseForm.formState.errors.date?.message} required>
              <Input {...purchaseForm.register('date')} type="date" />
            </Field>

            <Btn
              type="submit"
              variant="primary"
              loading={purchaseForm.formState.isSubmitting}
              className="w-full mt-2"
            >
              Registrar compra
            </Btn>
          </form>
        </Modal>
      )}

      {/* ── Abono modal ─────────────────────────────────────────────────────── */}
      {showAbonoModal && selectedCard && (
        <Modal
          title="Registrar Abono"
          subtitle={`Tarjeta: ${selectedCard.name}`}
          onClose={() => setShowAbonoModal(false)}
        >
          <form onSubmit={abonoForm.handleSubmit(onAbonoSubmit)} className="space-y-4">
            <div className="rounded-2xl bg-surface-container-low p-4 space-y-1">
              <p className="text-xs text-on-surface-variant">Saldo de la tarjeta</p>
              <p className="text-2xl font-bold text-primary">{fmt(selectedCard.usedBalance)}</p>
            </div>

            <Field label="Monto abonado" error={abonoForm.formState.errors.amount?.message} required>
              <Input
                {...abonoForm.register('amount', { valueAsNumber: true })}
                type="number"
                step="any"
                min={0}
                placeholder="0"
              />
            </Field>

            {accounts.length > 0 && (
              <Field label="Descontar de cuenta (opcional)">
                <SelectField {...abonoForm.register('accountId')}>
                  <option value="">— Sin descontar de cuenta —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {fmt(a.balance)}
                    </option>
                  ))}
                </SelectField>
              </Field>
            )}

            <Field label="Fecha del pago" error={abonoForm.formState.errors.paidAt?.message} required>
              <Input {...abonoForm.register('paidAt')} type="date" />
            </Field>

            <Field label="Nota (opcional)" error={abonoForm.formState.errors.note?.message}>
              <Input {...abonoForm.register('note')} placeholder="ej. Pago mínimo junio" />
            </Field>

            {abonoError && (
              <div className="rounded-xl bg-error-container px-3 py-2 text-xs text-on-error-container">{abonoError}</div>
            )}

            <Btn
              type="submit"
              variant="primary"
              loading={abonoForm.formState.isSubmitting}
              className="w-full mt-2"
            >
              Registrar abono
            </Btn>
          </form>
        </Modal>
      )}

      <BottomNav />
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CardSummaryItem({
  card,
  onClick,
  onEdit,
  onDelete,
}: {
  card: CreditCardData;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const used = card.usedBalance;
  const limit = card.creditLimit;
  const available = limit - used;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const { minPayment } = calcMinPayment(card);

  const barColor =
    pct >= 90 ? 'bg-error' : pct >= 70 ? 'bg-tertiary' : 'bg-secondary';

  return (
    <div
      className="glass-card rounded-[24px] p-5 shadow-card cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-semibold text-on-surface">{card.name}</p>
          <p className="text-xs text-on-surface-variant">{card.bank}</p>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition text-on-surface-variant"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-on-surface-variant mb-1.5">
          <span>Usado: {fmt(used)}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-container-low px-2 py-2">
          <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Disponible</p>
          <p className="text-xs font-semibold text-secondary">{fmt(available)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low px-2 py-2">
          <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Mín. estimado</p>
          <p className="text-xs font-semibold text-primary">{fmt(minPayment)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low px-2 py-2">
          <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">Corte/Vence</p>
          <p className="text-xs font-semibold text-on-surface">d{card.cutDay}/d{card.dueDay}</p>
        </div>
      </div>
    </div>
  );
}

function CardDetail({
  card,
  categories,
  onBack,
  onEdit,
  onDelete,
  onAddPurchase,
  onDeletePurchase,
  onAddAbono,
  onDeleteAbono,
}: {
  card: CreditCardData;
  categories: Category[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddPurchase: () => void;
  onDeletePurchase: (id: string) => void;
  onAddAbono: () => void;
  onDeleteAbono: (id: string) => void;
}) {
  const used = card.usedBalance;
  const limit = card.creditLimit;
  const available = limit - used;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const { cuotasMes, interesMes, minPayment } = calcMinPayment(card);
  const activePurchases = card.purchases.filter((p) => p.paidInstallments < p.installments);
  const barColor = pct >= 90 ? 'bg-error' : pct >= 70 ? 'bg-tertiary' : 'bg-secondary';

  return (
    <div className="space-y-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition"
        >
          <ChevronLeft size={18} />
          <span className="uppercase tracking-wider text-[10px] font-semibold">Volver</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition text-on-surface-variant"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="glass-card rounded-[24px] p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CreditCard size={22} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg text-on-surface">{card.name}</p>
            <p className="text-sm text-on-surface-variant">{card.bank}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-on-surface-variant mb-1.5">
            <span>Usado: {fmt(used)}</span>
            <span>{pct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Cupo total" value={fmt(limit)} />
          <Stat label="Disponible" value={fmt(available)} accent="secondary" />
          <Stat label="Tasa mensual" value={`${card.interestRate}%`} />
          <Stat label="Corte / Vence" value={`Día ${card.cutDay} / Día ${card.dueDay}`} />
        </div>
      </div>

      {/* Min payment breakdown */}
      <div className="glass-card rounded-[24px] p-5 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant mb-3">Pago mínimo estimado</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Cuotas del mes</span>
            <span className="font-medium">{fmt(cuotasMes)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Interés del mes</span>
            <span className="font-medium">{fmt(interesMes)}</span>
          </div>
          <div className="flex justify-between border-t border-outline-variant/20 pt-2 mt-2">
            <span className="font-semibold text-primary">Mínimo estimado</span>
            <span className="font-bold text-primary">{fmt(minPayment)}</span>
          </div>
        </div>
      </div>

      {/* Abonos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">
            Abonos ({card.payments.length})
          </p>
          <Btn variant="secondary" size="sm" icon={<Wallet size={14} />} onClick={onAddAbono}>
            Abonar
          </Btn>
        </div>

        {card.payments.length === 0 ? (
          <div className="glass-card rounded-[24px] p-6 text-center shadow-card">
            <Wallet size={28} className="text-on-surface-variant mx-auto mb-2 opacity-40" />
            <p className="text-on-surface-variant text-sm">Sin abonos registrados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {card.payments.map((payment) => (
              <div
                key={payment.id}
                className="glass-card rounded-[20px] p-4 shadow-card flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <Wallet size={15} className="text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-secondary">{fmt(payment.amount)}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(payment.paidAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {payment.note && (
                      <p className="text-xs text-on-surface-variant truncate">{payment.note}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteAbono(payment.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">
            Compras activas ({activePurchases.length})
          </p>
          <Btn variant="primary" size="sm" icon={<Plus size={14} />} onClick={onAddPurchase}>
            Registrar
          </Btn>
        </div>

        {activePurchases.length === 0 ? (
          <div className="glass-card rounded-[24px] p-8 text-center shadow-card">
            <ShoppingCart size={32} className="text-on-surface-variant mx-auto mb-2 opacity-40" />
            <p className="text-on-surface-variant text-sm">Sin compras activas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePurchases.map((p) => {
              const remaining = p.installments - p.paidInstallments;
              return (
                <div
                  key={p.id}
                  className="glass-card rounded-[24px] p-4 shadow-card flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingCart size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-on-surface truncate">{p.description}</p>
                      <p className="text-xs text-on-surface-variant">{p.category.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(p.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-on-surface">{fmt(p.installmentAmt)}/cuota</p>
                    <p className="text-xs text-on-surface-variant">
                      {remaining} de {p.installments} cuotas
                    </p>
                    <p className="text-xs text-on-surface-variant">{fmt(p.totalAmount)} total</p>
                  </div>
                  <button
                    onClick={() => onDeletePurchase(p.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'secondary' | 'primary';
}) {
  const valueClass =
    accent === 'secondary'
      ? 'text-secondary font-semibold'
      : accent === 'primary'
      ? 'text-primary font-semibold'
      : 'text-on-surface font-medium';

  return (
    <div className="rounded-xl bg-surface-container-low px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">{label}</p>
      <p className={`text-sm ${valueClass}`}>{value}</p>
    </div>
  );
}
