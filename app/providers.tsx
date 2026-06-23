'use client';
import { AuthProvider } from '@/lib/hooks/useAuth';
import { ThemeProvider } from '@/lib/hooks/useTheme';
import { ToastProvider } from '@/components/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
