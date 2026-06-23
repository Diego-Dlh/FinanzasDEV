'use client';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, TrendingUp, Pencil, Search } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { incomeSchema, type IncomeInput } from '@/lib/validators';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { Input, SelectField, Field, Btn } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

interface Category { id: string; name: string; type: string }
interface Account { id: string; name: string; type: string; balance: number }
interface Income {
  id: string; name: string; amount: number; date: string;
  frequency: string; category: { id: string; name: string }; account: { id: string; name: string };
}

const frequencyLabels: Record<string, string> = {
  DAILY: 'Diario', WEEKLY: 'Semanal', MONTHLY: 'Mensual', ONE_TIME: 'Único',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function fmtMonthLabel(ym: string) {
  const [year, month] = ym.split('-');
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${names[parseInt(month) - 1]} ${year}`;
}

export default function IncomesPage() {
  const { user, isLoading } = useProtected();
  const toast = useToast();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Income | null>(null);
  const [error, setError] = useState('');

  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<IncomeInput>({ resolver: zodResolver(incomeSchema) as any });

  async function loadData() {
    try {
      const [inc, cat, acc] = await Promise.all([
        api.get<{ incomes: Income[] }>('/ingresos'),
        api.get<{ categories: Category[] }>('/categorias'),
        api.get<{ accounts: Account[] }>('/cuentas'),
      ]);
      setIncomes(inc.incomes);
      setCategories(cat.categories.filter((c) => c.type === 'INCOME'));
      setAccounts(acc.accounts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  // Meses disponibles según los datos cargados
  const availableMonths = useMemo(() => {
    const monthSet = new Set(incomes.map((i) => i.date.substring(0, 7)));
    return Array.from(monthSet).sort().reverse();
  }, [incomes]);

  // Lista filtrada por mes y búsqueda
  const filtered = useMemo(() => {
    return incomes.filter((i) => {
      const inMonth = selectedMonth === 'all' || i.date.startsWith(selectedMonth);
      const q = search.toLowerCase();
      const inSearch = !q
        || i.name.toLowerCase().includes(q)
        || i.category.name.toLowerCase().includes(q)
        || i.account.name.toLowerCase().includes(q);
      return inMonth && inSearch;
    });
  }, [incomes, selectedMonth, search]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, i) => s + i.amount, 0),
    [filtered],
  );

  const monthlyRecurring = useMemo(
    () => filtered.filter((i) => i.frequency === 'MONTHLY').reduce((s, i) => s + i.amount, 0),
    [filtered],
  );

  function openAdd() {
    setEditTarget(null);
    reset({ date: new Date().toISOString().split('T')[0], frequency: 'MONTHLY' });
    setShowModal(true);
  }

  function openEdit(income: Income) {
    setEditTarget(income);
    reset({
      name: income.name,
      amount: income.amount,
      categoryId: income.category.id,
      accountId: income.account.id,
      date: new Date(income.date).toISOString().split('T')[0],
      frequency: income.frequency as IncomeInput['frequency'],
    });
    setShowModal(true);
  }

  async function onSubmit(data: IncomeInput) {
    setError('');
    try {
      if (editTarget) {
        await api.put(`/ingresos/${editTarget.id}`, data);
        toast.success('Ingreso actualizado');
      } else {
        await api.post('/ingresos', data);
        toast.success('Ingreso guardado');
      }
      setShowModal(false);
      await loadData();
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este ingreso?')) return;
    setError('');
    try {
      await api.delete(`/ingresos/${id}`);
      setIncomes((prev) => prev.filter((i) => i.id !== id));
      toast.success('Ingreso eliminado');
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  const summaryLabel = selectedMonth === 'all'
    ? 'Todos los registros'
    : fmtMonthLabel(selectedMonth);

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
      <TopBar title="Ingresos" />
      <section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">

        {error && (
          <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>
        )}

        {/* Summary */}
        <div className="glass-card rounded-[24px] p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">
                {summaryLabel}
              </p>
              <h2 className="mt-2 text-3xl font-bold text-secondary">{fmt(filteredTotal)}</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {filtered.length} fuente{filtered.length !== 1 ? 's' : ''} registrada{filtered.length !== 1 ? 's' : ''}
                {monthlyRecurring > 0 && monthlyRecurring !== filteredTotal && (
                  <span className="ml-2 text-on-surface-variant/60">· {fmt(monthlyRecurring)} recurrente</span>
                )}
              </p>
            </div>
            <div className="h-16 w-16 rounded-3xl bg-secondary/10 flex items-center justify-center">
              <TrendingUp size={28} className="text-secondary" />
            </div>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-semibold text-white transition hover:opacity-90 shadow-card"
        >
          <Plus size={18} /> Agregar Ingreso
        </button>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 rounded-2xl bg-surface-container px-3 py-2.5">
            <Search size={14} className="text-on-surface-variant shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none border-none"
            />
          </div>
          {/* Month selector */}
          <div className="sm:w-44">
            <SelectField
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">Todos los meses</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{fmtMonthLabel(m)}</option>
              ))}
            </SelectField>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-[24px] p-10 text-center shadow-card">
            <TrendingUp size={40} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
            {incomes.length === 0 ? (
              <>
                <p className="text-on-surface-variant text-sm">No tienes ingresos registrados.</p>
                <p className="text-xs text-on-surface-variant mt-1">Agrega tu primer ingreso para empezar.</p>
              </>
            ) : (
              <p className="text-on-surface-variant text-sm">Sin resultados para este filtro.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((income) => (
              <div key={income.id} className="glass-card rounded-[24px] p-5 shadow-card flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-secondary/10 flex items-center justify-center">
                    <TrendingUp size={18} className="text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{income.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {income.category.name} · {frequencyLabels[income.frequency] ?? income.frequency}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(income.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-secondary">{fmt(income.amount)}</p>
                  <button onClick={() => openEdit(income)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition text-on-surface-variant">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(income.id)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <Modal
          title={editTarget ? 'Editar Ingreso' : 'Nuevo Ingreso'}
          subtitle={editTarget ? 'Modifica los datos del ingreso' : 'Registra una nueva fuente de ingreso'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Nombre / Fuente" error={errors.name?.message} required>
              <Input {...register('name')} placeholder="ej. Salario mensual" />
            </Field>

            <Field label="Monto" error={errors.amount?.message} required>
              <Input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" placeholder="0" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoría" error={errors.categoryId?.message} required>
                <SelectField {...register('categoryId')}>
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
              </Field>
              <Field label="Cuenta" error={errors.accountId?.message} required>
                <SelectField {...register('accountId')}>
                  <option value="">Seleccionar...</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </SelectField>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha" error={errors.date?.message} required>
                <Input {...register('date')} type="date" />
              </Field>
              <Field label="Frecuencia">
                <SelectField {...register('frequency')}>
                  <option value="MONTHLY">Mensual</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="DAILY">Diario</option>
                  <option value="ONE_TIME">Único</option>
                </SelectField>
              </Field>
            </div>

            <Btn type="submit" variant="secondary" loading={isSubmitting} className="w-full mt-2">
              {editTarget ? 'Guardar cambios' : 'Agregar ingreso'}
            </Btn>
          </form>
        </Modal>
      )}

      <BottomNav />
    </main>
  );
}
