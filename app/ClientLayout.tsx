'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { ALERTS_REFRESH_EVENT } from '@/components/layout/topbar';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user }  = useAuth();
  const isAdmin   = pathname.startsWith('/admin');
  const isAuth    = pathname.startsWith('/auth');

  // Generar alertas automáticas de vencimiento una sola vez al iniciar sesión.
  // Se ejecuta en silencio: el usuario verá el badge en la campana si hay alertas nuevas.
  useEffect(() => {
    if (!user) return;
    api.post<{ created: number }>('/alertas/auto', {})
      .then(({ created }) => {
        // TopBar already loaded the alerts; tell it to refresh the bell badge
        if (created > 0) window.dispatchEvent(new Event(ALERTS_REFRESH_EVENT));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (isAdmin || isAuth) return <>{children}</>;

  return (
    <>
      <Sidebar />
      <div className="lg:pl-60">{children}</div>
    </>
  );
}
