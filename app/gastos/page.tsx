'use client';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, TrendingDown, Pencil, Search } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { expenseSchema, type ExpenseInput } from '@/lib/validators';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { Input, SelectField, Field, Btn } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

interface Category { id: string; name: string; type: string }
interface Account { id: string; name: string }
interface Expense {
  id: string; description: string; amount: number; date: string;
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

export default function ExpensesPage() {
  const { user, isLoading } = useProtected();
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [filterCat, setFilterCat] = useState('');
  const [error, setError] = useState('');

  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<ExpenseInput>({ resolver: zodResolver(expenseSchema) as any });

  async function loadData() {
    try {
      const [exp, cat, acc] = await Promise.all([
        api.get<{ expenses: Expense[] }>('/gastos'),
        api.get<{ categories: Category[] }>('/categorias'),
        api.get<{ accounts: Account[] }>('/cuentas'),
      ]);
      setExpenses(exp.expenses);
      setCategories(cat.categories.filter((c) => c.type === 'EXPENSE'));
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
    const monthSet = new Set(expenses.map((e) => e.date.substring(0, 7)));
    return Array.from(monthSet).sort().reverse();
  }, [expenses]);

  // Lista filtrada por mes, categoría y búsqueda
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const inMonth = selectedMonth === 'all' || e.date.startsWith(selectedMonth);
      const inCat = !filterCat || e.category.id === filterCat;
      const q = search.toLowerCase();
      const inSearch = !q
        || e.description.toLowerCase().includes(q)
        || e.category.name.toLowerCase().includes(q)
        || e.account.name.toLowerCase().includes(q);
      return inMonth && inCat && inSearch;
    });
  }, [expenses, selectedMonth, filterCat, search]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered],
  );

  function openAdd() {
    setEditTarget(null);
    reset({ date: new Date().toISOString().split('T')[0], frequency: 'ONE_TIME' });
    setShowModal(true);
  }

  function openEdit(expense: Expense) {
    setEditTarget(expense);
    reset({
      description: expense.description,
      amount: expense.amount,
      categoryId: expense.category.id,
      accountId: expense.account.id,
      date: new Date(expense.date).toISOString().split('T')[0],
      frequency: expense.frequency as ExpenseInput['frequency'],
    });
    setShowModal(true);
  }

  async function onSubmit(data: ExpenseInput) {
    setError('');
    try {
      if (editTarget) {
        await api.put(`/gastos/${editTarget.id}`, data);
        toast.success('Gasto actualizado');
      } else {
        await api.post('/gastos', data);
        toast.success('Gasto registrado');
      }
      setShowModal(false);
      await loadData();
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return;
    setError('');
    try {
      await api.delete(`/gastos/${id}`);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success('Gasto eliminado');
    } catch (e) {
      toast.error((e as Error).message);
      setError((e as Error).message);
    }
  }

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  const hasActiveFilters = !!search || !!filterCat || selectedMonth !== currentMonth;

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
      <TopBar title="Gastos" />
      <section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">

        {error && (
          <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>
        )}

        {/* Summary */}
        <div className="glass-card rounded-[24px] p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">Total gastos</p>
              <h2 className="mt-2 text-3xl font-bold text-error">{fmt(filteredTotal)}</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {filtered.length} transacción{filtered.length !== 1 ? 'es' : ''}
                {hasActiveFilters ? ' (filtrado)' : ' registradas'}
              </p>
            </div>
            <div className="h-16 w-16 rounded-3xl bg-error/10 flex items-center justify-center">
              <TrendingDown size={28} className="text-error" />
            </div>
          </div>
        </div>

        {/* Filters + Add */}
        <div className="space-y-3">
          {/* Search + Add */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 flex-1 rounded-2xl bg-surface-container px-3 py-2.5">
              <Search size={14} className="text-on-surface-variant shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descripción..."
                className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none border-none"
              />
            </div>
            <Btn variant="danger" size="md" icon={<Plus size={16} />} onClick={openAdd}>
              Agregar
            </Btn>
          </div>

          {/* Category + Month */}
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>

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
            <TrendingDown size={40} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
            {expenses.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No hay gastos registrados.</p>
            ) : (
              <p className="text-on-surface-variant text-sm">Sin resultados para este filtro.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((expense) => (
              <div key={expense.id} className="glass-card rounded-[24px] p-5 shadow-card flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-error/10 flex items-center justify-center">
                    <TrendingDown size={18} className="text-error" />
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{expense.description}</p>
                    <p className="text-xs text-on-surface-variant">
                      {expense.category.name} · {frequencyLabels[expense.frequency] ?? expense.frequency}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(expense.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-error">{fmt(expense.amount)}</p>
                  <button onClick={() => openEdit(expense)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition text-on-surface-variant">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(expense.id)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error">
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
          title={editTarget ? 'Editar Gasto' : 'Registrar Gasto'}
          subtitle={editTarget ? 'Modifica los datos del gasto' : 'Añade un nuevo gasto o egreso'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Descripción" error={errors.description?.message} required>
              <Input {...register('description')} placeholder="ej. Supermercado Éxito" />
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
                  <option value="ONE_TIME">Único</option>
                  <option value="MONTHLY">Mensual</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="DAILY">Diario</option>
                </SelectField>
              </Field>
            </div>

            <Btn type="submit" variant="danger" loading={isSubmitting} className="w-full mt-2">
              {editTarget ? 'Guardar cambios' : 'Registrar gasto'}
            </Btn>
          </form>
        </Modal>
      )}

      <BottomNav />
    </main>
  );
}
