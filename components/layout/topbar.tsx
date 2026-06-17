'use client';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

export function TopBar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/auth/login');
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? 'U';

  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-outline-variant/10 bg-surface/90 backdrop-blur-xl px-6 py-4 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-on-secondary font-semibold text-lg select-none">
            {initial}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-on-surface-variant">
              {user ? `Hola, ${user.name.split(' ')[0]}` : 'Bienvenido'}
            </p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container shadow-sm transition hover:opacity-90">
            <Bell size={20} className="text-on-surface" />
          </button>
          {user && (
            <button
              onClick={handleLogout}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container shadow-sm transition hover:bg-error-container hover:text-error"
              title="Cerrar sesión"
            >
              <LogOut size={18} className="text-on-surface-variant" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
