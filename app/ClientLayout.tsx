'use client';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin  = pathname.startsWith('/admin');
  const isAuth   = pathname.startsWith('/auth');

  if (isAdmin || isAuth) return <>{children}</>;

  return (
    <>
      <Sidebar />
      <div className="lg:pl-60">{children}</div>
    </>
  );
}
