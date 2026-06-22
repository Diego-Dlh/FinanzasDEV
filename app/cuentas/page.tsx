'use client';
import { useEffect, useState } from 'react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { TopBar } from '@/components/layout/topbar';
import { BottomNav } from '@/components/layout/bottomnav';
import { PageSpinner } from '@/components/ui/spinner';
import { Eye, EyeOff, Wallet, Building2, Smartphone, CreditCard } from 'lucide-react';

type AccountType = 'CASH' | 'BANK' | 'NEQUI' | 'DAVIPLATA' | 'CARD';

interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  hideFromTotal: boolean;
}

const TYPE_LABEL: Record<AccountType, string> = {
  CASH: 'Efectivo',
  BANK: 'Banco',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  CARD: 'Tarjeta débito',
};

function TypeIcon({ type }: { type: AccountType }) {
  const cls = 'shrink-0';
  if (type === 'CASH') return <Wallet size={18} className={cls} />;
  if (type === 'BANK') return <Building2 size={18} className={cls} />;
  if (type === 'NEQUI' || type === 'DAVIPLATA') return <Smartphone size={18} className={cls} />;
  return <CreditCard size={18} className={cls} />;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CuentasPage() {
  const { user, isLoading } = useProtected();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<{ accounts: Account[] }>('/cuentas')
      .then(r => setAccounts(r.accounts))
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [user]);

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  const visibleTotal = accounts
    .filter(a => !a.hideFromTotal)
    .reduce((s, a) => s + a.balance, 0);

  async function toggleHide(account: Account) {
    if (toggling) return;
    setToggling(account.id);
    const next = !account.hideFromTotal;
    setAccounts(prev =>
      prev.map(a => (a.id === account.id ? { ...a, hideFromTotal: next } : a))
    );
    try {
      await api.put(`/cuentas/${account.id}`, { hideFromTotal: next });
    } catch {
      setAccounts(prev =>
        prev.map(a => (a.id === account.id ? { ...a, hideFromTotal: !next } : a))
      );
    } finally {
      setToggling(null);
    }
  }

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
      <TopBar title="Mis Cuentas" />
      <section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">

        {/* Total visible */}
        <div className="rounded-[24px] bg-gradient-to-br from-black via-gray-900 to-gray-800 p-6 text-white shadow-xl">
          <p className="text-xs uppercase tracking-[0.25em] opacity-70 mb-1">Saldo total visible</p>
          <p className="text-4xl font-bold tracking-tight">{fmt(visibleTotal)}</p>
          <p className="text-sm opacity-60 mt-2">
            {accounts.filter(a => !a.hideFromTotal).length} de {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} incluida{accounts.filter(a => !a.hideFromTotal).length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Lista de cuentas */}
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant px-1">
            Toca el ojo para incluir o excluir del total
          </p>
          {accounts.length === 0 ? (
            <div className="glass-card rounded-[24px] p-8 text-center shadow-card">
              <p className="text-on-surface-variant text-sm">No tienes cuentas registradas aún.</p>
            </div>
          ) : (
            accounts.map(account => (
              <div
                key={account.id}
                className={`flex items-center gap-4 rounded-2xl px-4 py-4 transition-opacity ${
                  account.hideFromTotal
                    ? 'bg-surface-container-low opacity-60'
                    : 'bg-surface-container'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  account.hideFromTotal ? 'bg-on-surface/10 text-on-surface-variant' : 'bg-secondary/15 text-secondary'
                }`}>
                  <TypeIcon type={account.type} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${account.hideFromTotal ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                    {account.name}
                  </p>
                  <p className="text-xs text-on-surface-variant">{TYPE_LABEL[account.type]}</p>
                </div>

                <p className={`text-sm font-semibold shrink-0 mr-2 ${account.hideFromTotal ? 'text-on-surface-variant line-through' : 'text-secondary'}`}>
                  {fmt(account.balance)}
                </p>

                <button
                  onClick={() => toggleHide(account)}
                  disabled={toggling === account.id}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-on-surface/10 disabled:opacity-40"
                  aria-label={account.hideFromTotal ? 'Incluir en total' : 'Excluir del total'}
                >
                  {account.hideFromTotal
                    ? <EyeOff size={18} className="text-on-surface-variant" />
                    : <Eye size={18} className="text-secondary" />
                  }
                </button>
              </div>
            ))
          )}
        </div>

      </section>
      <BottomNav />
    </main>
  );
}
