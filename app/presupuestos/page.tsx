'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Target, Pencil, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useProtected } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';
import { budgetSchema, type BudgetInput, goalSchema, type GoalInput } from '@/lib/validators';
import { BottomNav } from '@/components/layout/bottomnav';
import { TopBar } from '@/components/layout/topbar';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { Input, Field, Btn } from '@/components/ui/field';

interface Budget { id: string; name: string; allocated: number; spent: number }
interface Goal {
  id: string; title: string; description: string;
  targetAmount: number; currentAmount: number; targetDate: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function monthsRemaining(targetDate: string) {
  const ms = new Date(targetDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (30 * 86400000)));
}

function goalStatus(g: Goal): { label: string; color: string } {
  const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
  const months = monthsRemaining(g.targetDate);
  if (pct >= 100) return { label: '¡Completada!', color: 'text-secondary bg-secondary/10' };
  if (months <= 1 && pct < 90) return { label: 'Urgente', color: 'text-error bg-error/10' };
  if (months <= 3 && pct < 50) return { label: 'Retrasada', color: 'text-on-tertiary-container bg-tertiary-container/20' };
  if (pct >= 75) return { label: 'Casi ahí', color: 'text-secondary bg-secondary/10' };
  return { label: 'En curso', color: 'text-primary bg-primary/10' };
}

export default function BudgetPage() {
  const { user, isLoading } = useProtected();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddProgressModal, setShowAddProgressModal] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [progressTarget, setProgressTarget] = useState<Goal | null>(null);
  const [progressAmount, setProgressAmount] = useState(0);
  const [error, setError] = useState('');

  const { register: regB, handleSubmit: handleB, reset: resetB, formState: { errors: errB, isSubmitting: submB } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<BudgetInput>({ resolver: zodResolver(budgetSchema) as any });

  const { register: regG, handleSubmit: handleG, reset: resetG, formState: { errors: errG, isSubmitting: submG } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<GoalInput>({ resolver: zodResolver(goalSchema) as any });

  async function loadData() {
    try {
      const [b, g] = await Promise.all([
        api.get<{ budgets: Budget[] }>('/presupuestos'),
        api.get<{ goals: Goal[] }>('/metas'),
      ]);
      setBudgets(b.budgets);
      setGoals(g.goals);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  async function onSubmitBudget(data: BudgetInput) {
    try {
      if (editBudget) {
        await api.put(`/presupuestos/${editBudget.id}`, data);
      } else {
        await api.post('/presupuestos', data);
      }
      setShowBudgetModal(false);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onSubmitGoal(data: GoalInput) {
    try {
      if (editGoal) {
        await api.put(`/metas/${editGoal.id}`, data);
      } else {
        await api.post('/metas', data);
      }
      setShowGoalModal(false);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleAddProgress() {
    if (!progressTarget || progressAmount <= 0) return;
    try {
      await api.put(`/metas/${progressTarget.id}`, {
        currentAmount: progressTarget.currentAmount + progressAmount,
      });
      setShowAddProgressModal(false);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteBudget(id: string) {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    try { await api.delete(`/presupuestos/${id}`); setBudgets((p) => p.filter((b) => b.id !== id)); }
    catch (e) { setError((e as Error).message); }
  }

  async function deleteGoal(id: string) {
    if (!confirm('¿Eliminar esta meta?')) return;
    try { await api.delete(`/metas/${id}`); setGoals((p) => p.filter((g) => g.id !== id)); }
    catch (e) { setError((e as Error).message); }
  }

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32">
      <TopBar title="Presupuestos y Metas" />
      <section className="pt-24 px-6 max-w-2xl mx-auto space-y-6">

        {error && (
          <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>
        )}

        {/* Budgets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">Control de gasto</p>
              <h2 className="text-xl font-semibold text-primary mt-0.5">Presupuestos</h2>
            </div>
            <button
              onClick={() => { setEditBudget(null); resetB(); setShowBudgetModal(true); }}
              className="flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition"
            >
              <Plus size={14} /> Nuevo
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="glass-card rounded-[24px] p-8 text-center shadow-card">
              <p className="text-on-surface-variant text-sm">No tienes presupuestos. Crea uno para controlar tus gastos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map((b) => {
                const pct = b.allocated > 0 ? Math.min((b.spent / b.allocated) * 100, 100) : 0;
                const over = b.spent > b.allocated;
                const warning = pct >= 80 && !over;
                return (
                  <div key={b.id} className="glass-card rounded-[24px] p-5 shadow-card">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${over ? 'bg-error/10' : warning ? 'bg-amber-50' : 'bg-secondary/10'}`}>
                          {over ? <AlertTriangle size={16} className="text-error" /> : warning ? <AlertTriangle size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-secondary" />}
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface">{b.name}</p>
                          <p className="text-xs text-on-surface-variant">{fmt(b.spent)} / {fmt(b.allocated)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${over ? 'bg-error/10 text-error' : warning ? 'bg-amber-50 text-amber-600' : 'bg-secondary/10 text-secondary'}`}>
                          {over ? 'Excedido' : warning ? 'Cuidado' : 'OK'}
                        </span>
                        <button onClick={() => { setEditBudget(b); resetB({ name: b.name, allocated: b.allocated }); setShowBudgetModal(true); }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-container transition text-on-surface-variant">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteBudget(b.id)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${over ? 'bg-error' : warning ? 'bg-amber-400' : 'bg-secondary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-on-surface-variant text-right">{pct.toFixed(0)}% usado · Disponible: {fmt(Math.max(0, b.allocated - b.spent))}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Goals Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">Objetivos financieros</p>
              <h2 className="text-xl font-semibold text-primary mt-0.5">Metas</h2>
            </div>
            <button
              onClick={() => { setEditGoal(null); resetG({ currentAmount: 0, targetDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0] }); setShowGoalModal(true); }}
              className="flex items-center gap-1.5 rounded-2xl bg-secondary px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition"
            >
              <Plus size={14} /> Nueva meta
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="glass-card rounded-[24px] p-8 text-center shadow-card">
              <Target size={40} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
              <p className="text-on-surface-variant text-sm">No tienes metas definidas. ¡Define tu próximo objetivo!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((g) => {
                const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
                const months = monthsRemaining(g.targetDate);
                const needed = months > 0 ? Math.max(0, (g.targetAmount - g.currentAmount) / months) : 0;
                const status = goalStatus(g);
                return (
                  <div key={g.id} className="glass-card rounded-[24px] overflow-hidden shadow-card">
                    <div className="bg-gradient-to-br from-secondary/20 to-primary/10 h-3">
                      <div className="h-full bg-secondary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-on-surface">{g.title}</h3>
                          <p className="text-xs text-on-surface-variant mt-0.5">{g.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                          <button onClick={() => { setEditGoal(g); resetG({ title: g.title, description: g.description, targetAmount: g.targetAmount, currentAmount: g.currentAmount, targetDate: new Date(g.targetDate).toISOString().split('T')[0] }); setShowGoalModal(true); }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-container transition text-on-surface-variant">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteGoal(g.id)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-error-container transition text-on-surface-variant hover:text-error">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="text-on-surface-variant text-xs">Actual</p>
                          <p className="font-bold text-secondary">{fmt(g.currentAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-on-surface-variant text-xs">Objetivo</p>
                          <p className="font-bold text-primary">{fmt(g.targetAmount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-on-surface-variant">
                        <span>{months > 0 ? `${months} meses restantes` : 'Fecha alcanzada'}</span>
                        {needed > 0 && <span className="font-semibold text-primary">Mensual: {fmt(needed)}</span>}
                      </div>
                      <button
                        onClick={() => { setProgressTarget(g); setProgressAmount(0); setShowAddProgressModal(true); }}
                        className="w-full rounded-xl bg-secondary/10 text-secondary py-2 text-xs font-semibold hover:bg-secondary/20 transition"
                      >
                        + Agregar progreso
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Budget Modal */}
      {showBudgetModal && (
        <Modal title={editBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'} subtitle="Define cuánto quieres gastar por categoría" onClose={() => setShowBudgetModal(false)}>
          <form onSubmit={handleB(onSubmitBudget)} className="space-y-4">
            <Field label="Categoría / Nombre" error={errB.name?.message} required>
              <Input {...regB('name')} placeholder="ej. Alimentación" />
            </Field>
            <Field label="Presupuesto asignado" error={errB.allocated?.message} required>
              <Input {...regB('allocated', { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" />
            </Field>
            <Btn type="submit" variant="primary" loading={submB} className="w-full mt-2">
              {editBudget ? 'Guardar cambios' : 'Crear presupuesto'}
            </Btn>
          </form>
        </Modal>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <Modal title={editGoal ? 'Editar Meta' : 'Nueva Meta Financiera'} subtitle="Define tu objetivo y fecha límite" onClose={() => setShowGoalModal(false)}>
          <form onSubmit={handleG(onSubmitGoal)} className="space-y-4">
            <Field label="Título" error={errG.title?.message} required>
              <Input {...regG('title')} placeholder="ej. Fondo de emergencia" />
            </Field>
            <Field label="Descripción" error={errG.description?.message}>
              <Input {...regG('description')} placeholder="ej. 6 meses de gastos" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monto objetivo" error={errG.targetAmount?.message} required>
                <Input {...regG('targetAmount', { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" />
              </Field>
              <Field label="Monto actual" error={errG.currentAmount?.message}>
                <Input {...regG('currentAmount', { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" />
              </Field>
            </div>
            <Field label="Fecha objetivo" error={errG.targetDate?.message} required>
              <Input {...regG('targetDate')} type="date" />
            </Field>
            <Btn type="submit" variant="secondary" loading={submG} className="w-full mt-2">
              {editGoal ? 'Guardar cambios' : 'Crear meta'}
            </Btn>
          </form>
        </Modal>
      )}

      {/* Add Progress Modal */}
      {showAddProgressModal && progressTarget && (
        <Modal title={`Progreso: ${progressTarget.title}`} subtitle="Agrega un abono a tu meta" onClose={() => setShowAddProgressModal(false)}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="text-xs text-on-surface-variant mb-1">Progreso actual</p>
              <p className="font-bold text-secondary">{fmt(progressTarget.currentAmount)} / {fmt(progressTarget.targetAmount)}</p>
            </div>
            <Field label="Agregar monto">
              <Input
                type="number" step="0.01" min="0"
                value={progressAmount || ''}
                onChange={(e) => setProgressAmount(Number(e.target.value))}
                placeholder="0.00"
              />
            </Field>
            <Btn variant="secondary" onClick={handleAddProgress} className="w-full">
              Agregar {progressAmount > 0 ? fmt(progressAmount) : ''}
            </Btn>
          </div>
        </Modal>
      )}

      <BottomNav />
    </main>
  );
}
