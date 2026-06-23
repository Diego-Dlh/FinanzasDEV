'use client';
import { useProtected } from '@/lib/hooks/useAuth';
import { TopBar } from '@/components/layout/topbar';
import { BottomNav } from '@/components/layout/bottomnav';
import { PageSpinner } from '@/components/ui/spinner';
import {
  Sparkles, GitBranch, Shield, TrendingUp, TrendingDown, CreditCard,
  Target, Landmark, BarChart2, History, Cpu, Globe,
} from 'lucide-react';

const STACK = [
  'Next.js 15', 'React 18', 'TypeScript', 'Tailwind CSS v4',
  'Prisma ORM', 'PostgreSQL', 'Docker', 'Nginx',
];

const FEATURES = [
  { icon: TrendingUp,   label: 'Ingresos',         desc: 'Registro por categoría, cuenta y frecuencia' },
  { icon: TrendingDown, label: 'Gastos',            desc: 'Control detallado de egresos con categorías' },
  { icon: CreditCard,   label: 'Tarjetas',          desc: 'Compras en cuotas y abonos con saldo en tiempo real' },
  { icon: Landmark,     label: 'Deudas',            desc: 'Seguimiento de deudas con pagos y tasa de interés' },
  { icon: Target,       label: 'Metas',             desc: 'Objetivos de ahorro con progreso visual' },
  { icon: BarChart2,    label: 'Dashboard',         desc: 'Health score, cashflow chart y resumen financiero' },
  { icon: History,      label: 'Historial',         desc: 'Filtros por período, tipo y categoría con gráficas' },
  { icon: Cpu,          label: 'IA (próximamente)', desc: 'Análisis inteligente de tus patrones de gasto' },
];

const ROADMAP = [
  { version: '1.0', label: 'Lanzamiento inicial', done: true,  desc: 'CRUD completo, dashboard, dark mode, panel admin' },
  { version: '1.1', label: 'Tarjetas de crédito', done: true,  desc: 'Compras en cuotas, abonos, saldo automático' },
  { version: '1.2', label: 'Historial avanzado',  done: true,  desc: 'Filtros, bar chart mensual, donut por categoría' },
  { version: '1.3', label: 'Panel admin',          done: true,  desc: 'Gestión de usuarios, claves de registro, categorías' },
  { version: '1.4', label: 'SSL & producción',     done: false, desc: 'HTTPS con Let\'s Encrypt, deploy en VPS Hostinger' },
  { version: '1.5', label: 'IA financiera',        done: false, desc: 'Integración con modelo de lenguaje para análisis' },
  { version: '1.6', label: 'Open source',          done: false, desc: 'Repositorio público en GitHub para la comunidad' },
];

export default function AboutPage() {
  const { user, isLoading } = useProtected();
  if (isLoading) return <PageSpinner />;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
      <TopBar title="Acerca de" />
      <section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-8">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="rounded-[28px] bg-secondary/10 border border-secondary/20 px-6 py-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 shrink-0 rounded-3xl bg-secondary flex items-center justify-center shadow-lg">
            <Sparkles size={36} className="text-on-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Lumina Finance</h1>
            <p className="text-sm text-secondary font-semibold uppercase tracking-widest mt-0.5">
              Finanzas personales · Colombia
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-3">
              Aplicación de finanzas personales premium en español, diseñada para el mercado colombiano.
              Gestiona ingresos, gastos, deudas, metas, presupuestos y tarjetas de crédito en un solo lugar,
              con una experiencia visual moderna y soporte nativo para COP.
            </p>
          </div>
        </div>

        {/* ── Features grid ─────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs uppercase tracking-[0.25em] text-on-surface-variant mb-4">Funcionalidades</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-card rounded-[20px] p-4 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <Icon size={16} className="text-secondary" />
                </div>
                <p className="font-semibold text-sm text-on-surface">{label}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Roadmap ───────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs uppercase tracking-[0.25em] text-on-surface-variant mb-4">Roadmap</h2>
          <div className="space-y-2">
            {ROADMAP.map(({ version, label, done, desc }) => (
              <div
                key={version}
                className={`flex items-start gap-4 rounded-2xl px-4 py-3.5 ${
                  done ? 'bg-surface-container' : 'bg-surface-container-low border border-outline-variant/15'
                }`}
              >
                <span className={`mt-0.5 font-mono text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                  done
                    ? 'bg-secondary/20 text-secondary'
                    : version === '1.6'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  v{version}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${done ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {label}
                    </p>
                    {done && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">
                        Listo
                      </span>
                    )}
                    {version === '1.6' && !done && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Open Source
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Developer ───────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs uppercase tracking-[0.25em] text-on-surface-variant mb-4">Desarrollador</h2>
            <div className="glass-card rounded-[24px] p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 shrink-0 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-2xl select-none">
                  D
                </div>
                <div>
                  <p className="font-bold text-on-surface text-base">Diego Andrés De la Hoz Ballena</p>
                  <p className="text-xs text-secondary font-semibold uppercase tracking-wider mt-0.5">
                    Ingeniero de Sistemas · 23 años
                  </p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Desarrollé Lumina Finance como proyecto personal para llevar el control de mis finanzas
                de forma ordenada y visual. Quería una herramienta hecha a la medida del mercado colombiano,
                con soporte para COP, tarjetas de crédito en cuotas y una experiencia de usuario premium.
                Es también un espacio para explorar y aplicar tecnologías modernas de desarrollo web full-stack.
              </p>
              <a
                href="https://github.com/Diego-Dlh/FinanzasDEV"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-surface-container-high px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition w-fit"
              >
                <GitBranch size={15} />
                Diego-Dlh · GitHub
              </a>
            </div>
          </div>

          {/* ── Stack & Open source ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xs uppercase tracking-[0.25em] text-on-surface-variant mb-4">Stack tecnológico</h2>
              <div className="glass-card rounded-[24px] p-5">
                <div className="flex flex-wrap gap-2">
                  {STACK.map((t) => (
                    <span key={t} className="text-xs font-medium bg-secondary/15 text-secondary px-3 py-1.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
                  <Globe size={12} />
                  Deploy: VPS Hostinger Ubuntu 24.04 · Docker Compose · Nginx
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-primary/10 border border-primary/20 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-primary" />
                <p className="font-semibold text-sm text-on-surface">Open Source — v1.6</p>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                En la versión 1.6 el repositorio de Lumina Finance quedará completamente abierto
                para la comunidad. Cualquier desarrollador podrá clonar, adaptar y contribuir
                al proyecto libremente.
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-primary/50" />
                <span className="text-[11px] text-primary font-medium">Próximamente en GitHub</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant text-center pb-2">
          Versión 1.3 · 2026 · Hecho con dedicación en Colombia por Diego De la Hoz
        </p>

      </section>
      <BottomNav />
    </main>
  );
}
