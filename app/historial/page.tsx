'use client';
import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, Search, History } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { PageSpinner } from '@/components/ui/spinner';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  label: string;
  amount: number;
  category: string;
  categoryId: string;
  account: string;
  date: string;
}

interface HistorialData {
  transactions: Transaction[];
  summary: { totalIncome: number; totalExpenses: number; balance: number };
  byMonth: { month: string; income: number; expense: number }[];
  byCategory: { name: string; amount: number; count: number }[];
}

interface Category { id: string; name: string; type: string }

// ── Helpers ────────────────────────────────────────────────────────────────────
const PERIODS = [
  { key: 'month' as const,       label: 'Este mes' },
  { key: 'last-month' as const,  label: 'Mes anterior' },
  { key: '3m' as const,          label: '3 meses' },
  { key: '6m' as const,          label: '6 meses' },
  { key: 'year' as const,        label: 'Este año' },
];
type Period = typeof PERIODS[number]['key'];

function periodToRange(p: Period): { from: string; to: string } {
  const now = new Date();
  const pad = (d: Date) => d.toISOString().split('T')[0];
  if (p === 'month') {
    return { from: pad(new Date(now.getFullYear(), now.getMonth(), 1)), to: pad(now) };
  }
  if (p === 'last-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: pad(start), to: pad(end) };
  }
  if (p === '3m') {
    const d = new Date(now); d.setMonth(d.getMonth() - 3);
    return { from: pad(d), to: pad(now) };
  }
  if (p === '6m') {
    const d = new Date(now); d.setMonth(d.getMonth() - 6);
    return { from: pad(d), to: pad(now) };
  }
  return { from: pad(new Date(now.getFullYear(), 0, 1)), to: pad(now) };
}

function fmtMonth(key: string) {
  const [year, month] = key.split('-');
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${names[parseInt(month) - 1]} '${year.slice(2)}`;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const PIE_COLORS = ['#2563eb','#16a34a','#dc2626','#ca8a04','#7c3aed','#0891b2','#be185d','#ea580c','#065f46','#92400e'];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function HistorialPage() {
  const { user, isLoading } = useProtected();
  const [period, setPeriod]     = useState<Period>('month');
  const [type, setType]         = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [catId, setCatId]       = useState('');
  const [search, setSearch]     = useState('');
  const [data, setData]         = useState<HistorialData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const { from, to } = periodToRange(period);
      const qs = new URLSearchParams({ from, to, type, ...(catId ? { categoryId: catId } : {}) });
      const [histRes, catRes] = await Promise.all([
        api.get<HistorialData>(`/historial?${qs}`),
        categories.length ? Promise.resolve({ categories }) : api.get<{ categories: Category[] }>('/categorias'),
      ]);
      setData(histRes);
      if (!categories.length) setCategories((catRes as { categories: Category[] }).categories);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }

  useEffect(() => { if (user) loadData(); }, [user, period, type, catId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    if (!q) return data.transactions;
    return data.transactions.filter(
      (t) => t.label.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    );
  }, [data, search]);

  if (isLoading) return <PageSpinner />;
  if (!user)     return null;

  const s = data?.summary ?? { totalIncome: 0, totalExpenses: 0, balance: 0 };
  const chartData = data?.byMonth.map((m) => ({ ...m, name: fmtMonth(m.month) })) ?? [];
  const pieData   = data?.byCategory.slice(0, 8) ?? [];

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
      <TopBar title="Historial" />
      <section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">

        {/* ── Period chips ──────────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                period === p.key
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ── Filters row ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Type */}
          <div className="flex rounded-2xl bg-surface-container p-1 gap-1">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  type === t
                    ? t === 'INCOME' ? 'bg-secondary text-on-secondary'
                      : t === 'EXPENSE' ? 'bg-error text-on-error'
                      : 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t === 'ALL' ? 'Todo' : t === 'INCOME' ? 'Ingresos' : 'Gastos'}
              </button>
            ))}
          </div>

          {/* Category */}
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="rounded-2xl bg-surface-container text-on-surface text-xs px-4 py-2.5 border-none outline-none cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            label="Ingresos"
            value={fmtShort(s.totalIncome)}
            icon={TrendingUp}
            color="text-secondary"
            bg="bg-secondary/10"
          />
          <SummaryCard
            label="Gastos"
            value={fmtShort(s.totalExpenses)}
            icon={TrendingDown}
            color="text-error"
            bg="bg-error/10"
          />
          <SummaryCard
            label="Balance"
            value={fmtShort(s.balance)}
            icon={Wallet}
            color={s.balance >= 0 ? 'text-secondary' : 'text-error'}
            bg={s.balance >= 0 ? 'bg-secondary/10' : 'bg-error/10'}
          />
        </div>

        {/* ── Charts row ────────────────────────────────────────────────────── */}
        {!loading && data && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Bar chart — monthly income vs expense */}
            <div className="lg:col-span-3 glass-card rounded-[24px] p-5 shadow-card">
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant mb-4">
                Ingresos vs Gastos por mes
              </p>
              {chartData.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                        tickFormatter={(v) => fmtShort(v)} />
                      <Tooltip
                        contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}
                        formatter={(v, name) => [fmt(Number(v)), name === 'income' ? 'Ingresos' : 'Gastos']}
                      />
                      <Bar dataKey="income"  name="income"  fill="#006e2a" radius={[8, 8, 0, 0]} barSize={16} />
                      <Bar dataKey="expense" name="expense" fill="#ba1a1a" radius={[8, 8, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Pie chart — expenses by category */}
            <div className="lg:col-span-2 glass-card rounded-[24px] p-5 shadow-card">
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant mb-4">
                Gastos por categoría
              </p>
              {pieData.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={72}
                        innerRadius={36}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}
                        formatter={(v) => [fmt(Number(v)), 'Gasto']}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="glass-card rounded-[24px] p-10 shadow-card flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {/* ── Transaction list ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant shrink-0">
              Transacciones ({filtered.length})
            </p>
            <div className="flex items-center gap-2 flex-1 max-w-xs rounded-2xl bg-surface-container px-3 py-2">
              <Search size={14} className="text-on-surface-variant shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none border-none"
              />
            </div>
          </div>

          {!loading && filtered.length === 0 && (
            <div className="glass-card rounded-[24px] p-10 text-center shadow-card">
              <History size={36} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
              <p className="text-on-surface-variant text-sm">Sin transacciones para este período.</p>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((t) => (
              <TransactionRow key={t.id} t={t} />
            ))}
          </div>
        </div>

      </section>
      <BottomNav />
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, icon: Icon, color, bg,
}: { label: string; value: string; icon: React.ElementType; color: string; bg: string }) {
  return (
    <div className="glass-card rounded-[24px] p-4 shadow-card space-y-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
        <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function TransactionRow({ t }: { t: Transaction }) {
  const isIncome = t.type === 'INCOME';
  const date = new Date(t.date);
  const dateStr = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="glass-card rounded-[20px] px-4 py-3.5 shadow-card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        isIncome ? 'bg-secondary/10' : 'bg-error/10'
      }`}>
        {isIncome
          ? <TrendingUp size={16} className="text-secondary" />
          : <TrendingDown size={16} className="text-error" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-on-surface truncate">{t.label}</p>
        <p className="text-xs text-on-surface-variant truncate">{t.category} · {t.account}</p>
      </div>

      <div className="text-right shrink-0">
        <p className={`font-semibold text-sm ${isIncome ? 'text-secondary' : 'text-error'}`}>
          {isIncome ? '+' : '-'}{fmt(t.amount)}
        </p>
        <p className="text-[11px] text-on-surface-variant">{dateStr}</p>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-52 flex items-center justify-center">
      <p className="text-sm text-on-surface-variant">Sin datos para este período.</p>
    </div>
  );
}
