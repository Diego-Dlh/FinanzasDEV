'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, TrendingDown, Landmark, Target, CreditCard, MoreHorizontal, Sparkles } from 'lucide-react';

const items = [
  { href: '/',             label: 'Inicio',   icon: Home },
  { href: '/ingresos',     label: 'Ingresos', icon: TrendingUp },
  { href: '/gastos',       label: 'Gastos',   icon: TrendingDown },
  { href: '/deudas',       label: 'Deudas',   icon: Landmark },
  { href: '/presupuestos', label: 'Metas',    icon: Target },
  { href: '/tarjetas',     label: 'Tarjetas', icon: CreditCard },
  { href: '/ia',           label: 'IA',       icon: MoreHorizontal },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 z-40 border-r border-outline-variant/10 bg-surface/95 backdrop-blur-xl">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
            <Sparkles size={17} className="text-on-secondary" />
          </div>
          <div>
            <p className="font-bold text-on-surface text-base leading-tight">Lumina</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Finance</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
