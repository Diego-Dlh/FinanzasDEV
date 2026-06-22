import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '@/components/layout/sidebar';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Lumina Finance – Finanzas Personales',
  description: 'Gestión financiera personal premium con dashboard, deudas, presupuestos y análisis inteligente.',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Runs synchronously before paint — prevents dark-mode flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}` }} />
        <Providers>
          <Sidebar />
          <div className="lg:pl-60">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
