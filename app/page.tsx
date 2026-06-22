'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, CreditCard, Gem } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { CashFlowChart } from '@/components/dashboard/cashflow-chart';
import { PageSpinner } from '@/components/ui/spinner';

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  netWorth: number;
  healthScore: number;
  transactions: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
  }>;
  cashFlow: Array<{ name: string; income: number; expense: number }>;
  accountsCount: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function scoreLabel(s: number) {
  if (s >= 85) return 'Excelente';
  if (s >= 70) return 'Bueno';
  if (s >= 50) return 'Regular';
  return 'Mejorar';
}

export default function HomePage() {
  const { user, isLoading } = useProtected();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<DashboardData>('/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [user]);

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  const d = data ?? {
    totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0,
    totalDebt: 0, netWorth: 0, healthScore: 50,
    transactions: [], cashFlow: [], accountsCount: 0,
  };

  const scoreOffset = 251.2 - (251.2 * d.healthScore) / 100;
  const overviewCards = [
    { label: 'Ingresos', value: fmtShort(d.monthlyIncome), icon: TrendingUp, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Gastos', value: fmtShort(d.monthlyExpenses), icon: TrendingDown, color: 'text-error', bg: 'bg-error/10' },
    { label: 'Total Deuda', value: fmtShort(d.totalDebt), icon: CreditCard, color: 'text-on-tertiary-container', bg: 'bg-tertiary-container/20' },
    { label: 'Patrimonio', value: fmtShort(d.netWorth), icon: Gem, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
      <TopBar title="Lumina Finance" />
      <section className="pt-24 pb-6 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">

        {/* Wealth Card + Health Score */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 relative rounded-[24px] p-6 text-white shadow-xl flex flex-col justify-between h-48 overflow-hidden bg-gradient-to-br from-black via-gray-900 to-gray-800">
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-secondary/20 blur-[60px] rounded-full" />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-on-primary-container opacity-80 mb-1">Saldo Disponible</p>
              <h2 className="text-4xl font-bold tracking-tight">{fmt(d.totalBalance)}</h2>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm opacity-70">{d.accountsCount} cuenta{d.accountsCount !== 1 ? 's' : ''} activa{d.accountsCount !== 1 ? 's' : ''}</p>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${d.monthlyIncome > d.monthlyExpenses ? 'bg-secondary/20 text-secondary-fixed-dim' : 'bg-error/20 text-tertiary-fixed-dim'}`}>
                {d.monthlyIncome > d.monthlyExpenses ? '+' : '-'} flujo {d.monthlyIncome > d.monthlyExpenses ? 'positivo' : 'negativo'}
              </span>
            </div>
          </div>

          <div className="glass-card rounded-[24px] p-5 flex flex-col items-center justify-center gap-3 shadow-card">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" stroke="#e4e2e4" strokeWidth="8" fill="none" />
                <circle
                  cx="50" cy="50" r="40" stroke="#006e2a" strokeWidth="8" fill="none"
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  strokeDashoffset={scoreOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-primary">
                {d.healthScore}
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-primary">Salud Financiera</p>
              <p className="text-xs text-on-surface-variant">{scoreLabel(d.healthScore)}</p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant mb-3 px-1">Resumen del mes</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-6 px-6">
            {overviewCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="min-w-[140px] glass-card p-4 rounded-2xl shadow-card flex-shrink-0 space-y-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bg}`}>
                    <Icon size={18} className={card.color} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">{card.label}</p>
                    <p className={`text-lg font-semibold mt-0.5 ${card.color}`}>{card.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cash Flow Chart */}
        <div className="glass-card rounded-[24px] p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">Flujo de Caja</h3>
              <p className="text-sm text-on-surface-variant">Últimos 7 días</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-secondary" />Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-error" />Gastos</span>
            </div>
          </div>
          <div className="h-48">
            {d.cashFlow.length > 0 ? (
              <CashFlowChart data={d.cashFlow} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-on-surface-variant">
                No hay transacciones en los últimos 7 días
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-semibold text-primary">Transacciones Recientes</h3>
          </div>
          {d.transactions.length === 0 ? (
            <div className="glass-card rounded-[24px] p-8 text-center shadow-card">
              <p className="text-on-surface-variant text-sm">No hay transacciones aún.</p>
              <p className="text-xs text-on-surface-variant mt-1">Agrega ingresos o gastos para verlos aquí.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {d.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4 hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold ${tx.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                      {tx.type === 'income' ? '+' : '-'}
                    </div>
                    <div>
                      <p className="font-medium text-primary text-sm">{tx.title}</p>
                      <p className="text-xs text-on-surface-variant">{tx.category} · {new Date(tx.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-secondary' : 'text-error'}`}>
                    {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </section>
      <BottomNav />
    </main>
  );
}
