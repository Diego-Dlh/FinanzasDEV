'use client';
import { useState } from 'react';
import { Calculator, TrendingUp, Percent, Shield, ChevronDown, ChevronUp, PiggyBank, Target } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { PageSpinner } from '@/components/ui/spinner';

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) { return `${n.toFixed(2)}%`; }

// ── Simple Interest ──────────────────────────────────────────────────────────
function SimpleInterestCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [time, setTime] = useState('');
  const [unit, setUnit] = useState<'months' | 'years'>('months');
  const [result, setResult] = useState<null | { interest: number; total: number }>(null);

  function calculate() {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    let t = parseFloat(time);
    if (!p || !r || !t) return;
    if (unit === 'months') t = t / 12;
    const interest = p * r * t;
    setResult({ interest, total: p + interest });
  }

  const inputCls = 'w-full rounded-2xl border border-outline-variant/50 bg-surface py-3 px-4 text-sm outline-none transition focus:border-secondary focus:ring-1 focus:ring-secondary/30';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Capital inicial</label>
          <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} className={inputCls} placeholder="1,000,000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Tasa anual (%)</label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} className={inputCls} placeholder="12" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Tiempo</label>
          <input type="number" value={time} onChange={e => setTime(e.target.value)} className={inputCls} placeholder="12" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Unidad</label>
          <select value={unit} onChange={e => setUnit(e.target.value as 'months' | 'years')} className={inputCls}>
            <option value="months">Meses</option>
            <option value="years">Años</option>
          </select>
        </div>
      </div>
      <button onClick={calculate} className="w-full rounded-2xl bg-secondary py-3 text-sm font-semibold text-white hover:opacity-90 transition">
        Calcular
      </button>
      {result && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-2xl bg-secondary/10 p-4 text-center">
            <p className="text-xs text-on-surface-variant mb-1">Interés generado</p>
            <p className="text-xl font-bold text-secondary">{fmt(result.interest)}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-4 text-center">
            <p className="text-xs text-on-surface-variant mb-1">Total al vencimiento</p>
            <p className="text-xl font-bold text-primary">{fmt(result.total)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compound Interest ────────────────────────────────────────────────────────
function CompoundInterestCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [years, setYears] = useState('');
  const [compound, setCompound] = useState('12');
  const [monthly, setMonthly] = useState('');
  const [result, setResult] = useState<null | { total: number; interest: number; monthly: number }>(null);

  function calculate() {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const n = parseInt(compound);
    const t = parseFloat(years);
    const m = parseFloat(monthly) || 0;
    if (!p || !r || !n || !t) return;

    const base = p * Math.pow(1 + r / n, n * t);
    const monthlyTotal = m > 0 ? m * ((Math.pow(1 + r / n, n * t) - 1) / (r / n)) : 0;
    const total = base + monthlyTotal;
    setResult({ total, interest: total - p - m * t * 12, monthly: m });
  }

  const inputCls = 'w-full rounded-2xl border border-outline-variant/50 bg-surface py-3 px-4 text-sm outline-none transition focus:border-secondary focus:ring-1 focus:ring-secondary/30';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Capital inicial</label>
          <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} className={inputCls} placeholder="5,000,000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Tasa anual (%)</label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} className={inputCls} placeholder="8" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Años</label>
          <input type="number" value={years} onChange={e => setYears(e.target.value)} className={inputCls} placeholder="10" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Capitalización</label>
          <select value={compound} onChange={e => setCompound(e.target.value)} className={inputCls}>
            <option value="1">Anual</option>
            <option value="2">Semestral</option>
            <option value="4">Trimestral</option>
            <option value="12">Mensual</option>
            <option value="365">Diaria</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-on-surface-variant">Aporte mensual (opcional)</label>
        <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} className={inputCls} placeholder="200,000" />
      </div>
      <button onClick={calculate} className="w-full rounded-2xl bg-secondary py-3 text-sm font-semibold text-white hover:opacity-90 transition">
        Calcular
      </button>
      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-secondary/10 p-4 text-center">
            <p className="text-xs text-on-surface-variant mb-1">Total acumulado</p>
            <p className="text-2xl font-bold text-secondary">{fmt(result.total)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-container-low p-3 text-center">
              <p className="text-xs text-on-surface-variant mb-1">Intereses ganados</p>
              <p className="text-lg font-bold text-primary">{fmt(result.interest)}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3 text-center">
              <p className="text-xs text-on-surface-variant mb-1">Capital aportado</p>
              <p className="text-lg font-bold text-on-surface">{fmt(parseFloat(principal || '0') + result.monthly * parseFloat(years || '0') * 12)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Loan Payment ─────────────────────────────────────────────────────────────
function LoanPaymentCalc() {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const [result, setResult] = useState<null | { payment: number; totalPaid: number; totalInterest: number }>(null);

  function calculate() {
    const P = parseFloat(amount);
    const r = parseFloat(rate) / 100 / 12;
    const n = parseInt(months);
    if (!P || !r || !n) return;
    const payment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPaid = payment * n;
    setResult({ payment, totalPaid, totalInterest: totalPaid - P });
  }

  const inputCls = 'w-full rounded-2xl border border-outline-variant/50 bg-surface py-3 px-4 text-sm outline-none transition focus:border-secondary focus:ring-1 focus:ring-secondary/30';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-on-surface-variant">Monto del préstamo</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} placeholder="20,000,000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Tasa efectiva anual (%)</label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} className={inputCls} placeholder="18" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Plazo (meses)</label>
          <input type="number" value={months} onChange={e => setMonths(e.target.value)} className={inputCls} placeholder="36" />
        </div>
      </div>
      <button onClick={calculate} className="w-full rounded-2xl bg-on-tertiary-container py-3 text-sm font-semibold text-white hover:opacity-90 transition">
        Calcular cuota
      </button>
      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-tertiary-container/20 p-5 text-center">
            <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wide">Cuota mensual</p>
            <p className="text-3xl font-bold text-on-tertiary-container">{fmt(result.payment)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-container-low p-3 text-center">
              <p className="text-xs text-on-surface-variant mb-1">Total a pagar</p>
              <p className="text-base font-bold text-on-surface">{fmt(result.totalPaid)}</p>
            </div>
            <div className="rounded-2xl bg-error/5 p-3 text-center">
              <p className="text-xs text-on-surface-variant mb-1">Total intereses</p>
              <p className="text-base font-bold text-error">{fmt(result.totalInterest)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Emergency Fund ───────────────────────────────────────────────────────────
function EmergencyFundCalc() {
  const [monthly, setMonthly] = useState('');
  const [months, setMonths] = useState('6');
  const [saved, setSaved] = useState('');
  const [monthlySaving, setMonthlySaving] = useState('');
  const [result, setResult] = useState<null | { goal: number; remaining: number; monthsToGoal: number }>(null);

  function calculate() {
    const m = parseFloat(monthly);
    const n = parseInt(months);
    const s = parseFloat(saved) || 0;
    const ms = parseFloat(monthlySaving);
    if (!m || !n) return;
    const goal = m * n;
    const remaining = Math.max(0, goal - s);
    const monthsToGoal = ms > 0 ? Math.ceil(remaining / ms) : 0;
    setResult({ goal, remaining, monthsToGoal });
  }

  const inputCls = 'w-full rounded-2xl border border-outline-variant/50 bg-surface py-3 px-4 text-sm outline-none transition focus:border-secondary focus:ring-1 focus:ring-secondary/30';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
        <p className="font-medium text-on-surface mb-1">¿Qué es un fondo de emergencia?</p>
        <p>Un colchón financiero equivalente a 3–6 meses de tus gastos fijos, para cubrir imprevistos sin endeudarte.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Gastos mensuales</label>
          <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} className={inputCls} placeholder="2,500,000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Meses de cobertura</label>
          <select value={months} onChange={e => setMonths(e.target.value)} className={inputCls}>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="9">9 meses</option>
            <option value="12">12 meses</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Ya tengo ahorrado</label>
          <input type="number" value={saved} onChange={e => setSaved(e.target.value)} className={inputCls} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Puedo ahorrar / mes</label>
          <input type="number" value={monthlySaving} onChange={e => setMonthlySaving(e.target.value)} className={inputCls} placeholder="500,000" />
        </div>
      </div>
      <button onClick={calculate} className="w-full rounded-2xl bg-secondary py-3 text-sm font-semibold text-white hover:opacity-90 transition">
        Calcular mi fondo
      </button>
      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-secondary/10 p-4 text-center">
            <p className="text-xs text-on-surface-variant mb-1">Meta del fondo de emergencia</p>
            <p className="text-2xl font-bold text-secondary">{fmt(result.goal)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-container-low p-3 text-center">
              <p className="text-xs text-on-surface-variant mb-1">Falta ahorrar</p>
              <p className="text-lg font-bold text-error">{fmt(result.remaining)}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3 text-center">
              <p className="text-xs text-on-surface-variant mb-1">Tiempo estimado</p>
              <p className="text-lg font-bold text-primary">
                {result.monthsToGoal > 0 ? `${result.monthsToGoal} meses` : result.remaining <= 0 ? '¡Listo!' : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Savings Goal ─────────────────────────────────────────────────────────────
function SavingsGoalCalc() {
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [months, setMonths] = useState('');
  const [rate, setRate] = useState('');
  const [result, setResult] = useState<null | { needed: number; withInterest: number }>(null);

  function calculate() {
    const T = parseFloat(target);
    const S = parseFloat(current) || 0;
    const n = parseInt(months);
    const r = parseFloat(rate) / 100 / 12;
    if (!T || !n) return;
    const remaining = T - S;
    if (remaining <= 0) { setResult({ needed: 0, withInterest: 0 }); return; }
    const needed = r > 0
      ? (remaining * r) / (Math.pow(1 + r, n) - 1)
      : remaining / n;
    setResult({ needed, withInterest: needed });
  }

  const inputCls = 'w-full rounded-2xl border border-outline-variant/50 bg-surface py-3 px-4 text-sm outline-none transition focus:border-secondary focus:ring-1 focus:ring-secondary/30';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Meta de ahorro</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)} className={inputCls} placeholder="10,000,000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Ya tengo ahorrado</label>
          <input type="number" value={current} onChange={e => setCurrent(e.target.value)} className={inputCls} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Plazo (meses)</label>
          <input type="number" value={months} onChange={e => setMonths(e.target.value)} className={inputCls} placeholder="24" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Tasa anual % (opcional)</label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} className={inputCls} placeholder="5" />
        </div>
      </div>
      <button onClick={calculate} className="w-full rounded-2xl bg-secondary py-3 text-sm font-semibold text-white hover:opacity-90 transition">
        Calcular ahorro mensual
      </button>
      {result && (
        <div className="rounded-2xl bg-secondary/10 p-5 text-center">
          <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wide">Debes ahorrar mensualmente</p>
          {result.needed <= 0 ? (
            <p className="text-xl font-bold text-secondary">¡Ya alcanzaste tu meta!</p>
          ) : (
            <p className="text-3xl font-bold text-secondary">{fmt(result.needed)}</p>
          )}
        </div>
      )}
    </div>
  );
}

const calculators = [
  { title: 'Interés Simple', desc: 'Calcula el rendimiento lineal de tu capital.', icon: Calculator, color: 'bg-secondary/10 text-secondary', Component: SimpleInterestCalc },
  { title: 'Interés Compuesto', desc: 'Simula el poder del interés sobre interés.', icon: TrendingUp, color: 'bg-primary/10 text-primary', Component: CompoundInterestCalc },
  { title: 'Cuota de Préstamo', desc: 'Calcula tu cuota mensual fija (sistema francés).', icon: Percent, color: 'bg-tertiary-container/30 text-on-tertiary-container', Component: LoanPaymentCalc },
  { title: 'Fondo de Emergencia', desc: 'Descubre cuánto necesitas para estar protegido.', icon: Shield, color: 'bg-secondary/10 text-secondary', Component: EmergencyFundCalc },
  { title: 'Meta de Ahorro', desc: 'Cuánto debo ahorrar mensualmente para llegar a mi meta.', icon: Target, color: 'bg-primary/10 text-primary', Component: SavingsGoalCalc },
];

export default function CalculatorsPage() {
  const { user, isLoading } = useProtected();
  const [open, setOpen] = useState<number | null>(0);

  if (isLoading) return <PageSpinner />;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32">
      <TopBar title="Calculadoras" />
      <section className="pt-24 px-6 max-w-2xl mx-auto space-y-4 pb-6">
        <div className="space-y-2 px-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">Herramientas</p>
          <h1 className="text-2xl font-semibold text-primary">Calculadoras Financieras</h1>
          <p className="text-sm text-on-surface-variant">Simula escenarios y toma decisiones informadas.</p>
        </div>

        {calculators.map((calc, i) => {
          const Icon = calc.icon;
          const isOpen = open === i;
          return (
            <div key={calc.title} className="glass-card rounded-[24px] shadow-card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-container-low/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${calc.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{calc.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{calc.desc}</p>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-on-surface-variant shrink-0" /> : <ChevronDown size={18} className="text-on-surface-variant shrink-0" />}
              </button>
              {isOpen && (
                <div className="border-t border-outline-variant/10 p-5">
                  <calc.Component />
                </div>
              )}
            </div>
          );
        })}
      </section>
      <BottomNav />
    </main>
  );
}
