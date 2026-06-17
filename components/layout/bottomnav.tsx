'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, TrendingDown, Landmark, Target, CreditCard, MoreHorizontal } from 'lucide-react';

const items = [
  { href: '/',             label: 'Inicio',   icon: Home },
  { href: '/ingresos',     label: 'Ingresos', icon: TrendingUp },
  { href: '/gastos',       label: 'Gastos',   icon: TrendingDown },
  { href: '/deudas',       label: 'Deudas',   icon: Landmark },
  { href: '/presupuestos', label: 'Metas',    icon: Target },
  { href: '/tarjetas',     label: 'Tarjetas', icon: CreditCard },
  { href: '/ia',           label: 'IA',       icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-outline-variant/10 bg-surface/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl px-4 py-2 transition-colors ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] uppercase tracking-[0.2em] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
