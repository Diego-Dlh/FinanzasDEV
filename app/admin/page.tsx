'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, RefreshCw, Trash2, Shield, KeyRound, LogOut, ChevronRight,
  UserCircle, Calendar, BarChart2, ArrowLeft, Tag, Pencil, Plus, Check, X, Info,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  _count: { incomes: number; expenses: number };
}

interface ActiveKey {
  id: string;
  code: string;
  active: boolean;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  newThisMonth: number;
  activeKey: ActiveKey | null;
}

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  createdAt: string;
  _count: { incomes: number; expenses: number; cardPurchases: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('auth_token') ?? '') : '';
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  Object.assign(headers, opts?.headers ?? {});

  const res = await fetch(`/api${path}`, { ...opts, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Error');
  return json as T;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady]         = useState(false);
  const [error, setError]         = useState('');
  const [stats, setStats]         = useState<Stats | null>(null);
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [key, setKey]             = useState<ActiveKey | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [newCode, setNewCode]     = useState('');

  // Category state
  const [categories, setCategories]     = useState<Category[]>([]);
  const [catTab, setCatTab]             = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [newCatName, setNewCatName]     = useState('');
  const [addingCat, setAddingCat]       = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editName, setEditName]         = useState('');
  const [catError, setCatError]         = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [statsRes, usersRes, keyRes, catsRes] = await Promise.all([
        apiFetch<Stats>('/admin/stats'),
        apiFetch<{ users: AdminUser[] }>('/admin/usuarios'),
        apiFetch<{ key: ActiveKey | null }>('/admin/clave'),
        apiFetch<{ categories: Category[] }>('/admin/categorias'),
      ]);
      setStats(statsRes);
      setUsers(usersRes.users);
      setKey(keyRes.key);
      setCategories(catsRes.categories);
      setNewCode('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { router.replace('/auth/login'); return; }

    apiFetch('/admin/me')
      .then(() => { setReady(true); load(); })
      .catch(() => router.replace('/'));
  }, [load, router]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  async function generateKey() {
    setGenLoading(true);
    setNewCode('');
    try {
      const res = await apiFetch<{ key: ActiveKey }>('/admin/clave', { method: 'POST' });
      setKey(res.key);
      setNewCode(res.key.code);
      const s = await apiFetch<Stats>('/admin/stats');
      setStats(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenLoading(false);
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name} y todos sus datos? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/admin/usuarios/${id}`, { method: 'DELETE' });
      setUsers((u) => u.filter((x) => x.id !== id));
      const s = await apiFetch<Stats>('/admin/stats');
      setStats(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    setCatError('');
    setAddingCat(true);
    try {
      const res = await apiFetch<{ category: Category }>('/admin/categorias', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim(), type: catTab }),
      });
      setCategories((prev) => [...prev, res.category].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCatName('');
    } catch (e) {
      setCatError((e as Error).message);
    } finally {
      setAddingCat(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setCatError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setCatError('');
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setCatError('');
    try {
      const res = await apiFetch<{ category: Category }>(`/admin/categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim() }),
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? res.category : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
    } catch (e) {
      setCatError((e as Error).message);
    }
  }

  async function deleteCategory(cat: Category) {
    const total = cat._count.incomes + cat._count.expenses + cat._count.cardPurchases;
    if (total > 0) {
      setCatError(`"${cat.name}" está en uso en ${total} registro(s) y no se puede eliminar.`);
      return;
    }
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    setCatError('');
    try {
      await apiFetch(`/admin/categorias/${cat.id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e) {
      setCatError((e as Error).message);
    }
  }

  function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.replace('/auth/login');
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  const filteredCats = categories.filter((c) => c.type === catTab);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-outline-variant/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center">
            <Shield size={18} className="text-secondary" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Admin Panel</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Lumina Finance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition"
          >
            <ArrowLeft size={15} />
            <span>Volver</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-on-surface-variant hover:text-error hover:bg-error-container transition"
          >
            <LogOut size={15} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {error && (
          <div className="rounded-2xl bg-error-container border border-error/30 px-4 py-3 text-sm text-on-error-container">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">Cerrar</button>
          </div>
        )}

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Usuarios totales"
            value={String(stats?.totalUsers ?? '—')}
            color="text-blue-500 dark:text-blue-400"
            bg="bg-blue-500/10"
          />
          <StatCard
            icon={Calendar}
            label="Nuevos este mes"
            value={String(stats?.newThisMonth ?? '—')}
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <StatCard
            icon={BarChart2}
            label="Clave activa"
            value={key?.code ?? 'Sin clave'}
            color="text-amber-600 dark:text-amber-400"
            bg="bg-amber-500/10"
            mono
          />
        </div>

        {/* ── Registration Key ────────────────────────────────────────────── */}
        <section className="rounded-[24px] bg-surface-container border border-outline-variant/20 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <KeyRound size={18} className="text-secondary" />
            <h2 className="font-semibold text-base">Clave de Registro</h2>
          </div>

          <p className="text-sm text-on-surface-variant">
            Comparte este código con quienes deban crear cuenta. Genera uno nuevo para invalidar el anterior.
          </p>

          {key ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                {key.code.split('').map((char, i) => (
                  <div
                    key={i}
                    className="w-12 h-14 rounded-xl bg-secondary/10 border border-secondary/30 flex items-center justify-center text-2xl font-bold text-secondary font-mono tracking-widest select-all"
                  >
                    {char}
                  </div>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant">
                Generada el {fmtDate(key.createdAt)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant italic">No hay clave activa.</p>
          )}

          {newCode && (
            <div className="rounded-2xl bg-secondary/10 border border-secondary/30 px-4 py-3 text-sm text-secondary flex items-center gap-2">
              <ChevronRight size={14} />
              Nueva clave generada: <span className="font-bold font-mono tracking-widest ml-1">{newCode}</span>
            </div>
          )}

          <button
            onClick={generateKey}
            disabled={genLoading}
            className="flex items-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary hover:opacity-90 transition disabled:opacity-50"
          >
            <RefreshCw size={15} className={genLoading ? 'animate-spin' : ''} />
            {genLoading ? 'Generando...' : 'Generar nueva clave'}
          </button>
        </section>

        {/* ── Categories ──────────────────────────────────────────────────── */}
        <section className="rounded-[24px] bg-surface-container border border-outline-variant/20 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Tag size={18} className="text-secondary" />
            <h2 className="font-semibold text-base">Categorías</h2>
            <span className="ml-auto text-xs text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">
              {categories.length} total
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {(['INCOME', 'EXPENSE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setCatTab(t); setCatError(''); setEditingId(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  catTab === t
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t === 'INCOME' ? 'Ingresos' : 'Egresos'}
                <span className="ml-1.5 text-xs opacity-70">
                  ({categories.filter((c) => c.type === t).length})
                </span>
              </button>
            ))}
          </div>

          {catError && (
            <div className="rounded-xl bg-error-container border border-error/20 px-3 py-2.5 text-sm text-on-error-container flex items-center justify-between gap-2">
              <span>{catError}</span>
              <button onClick={() => setCatError('')}><X size={14} /></button>
            </div>
          )}

          {/* Category list */}
          <div className="space-y-1.5">
            {filteredCats.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-6 italic">
                Sin categorías de {catTab === 'INCOME' ? 'ingresos' : 'egresos'}.
              </p>
            )}
            {filteredCats.map((cat) => {
              const usage = cat._count.incomes + cat._count.expenses + cat._count.cardPurchases;
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-surface-container-high"
                >
                  {isEditing ? (
                    <>
                      <input
                        ref={editInputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(cat.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="flex-1 bg-surface rounded-lg px-3 py-1.5 text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:border-secondary"
                      />
                      <button
                        onClick={() => saveEdit(cat.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/20 text-secondary hover:bg-secondary/30 transition"
                        title="Guardar"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container transition text-on-surface-variant"
                        title="Cancelar"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-on-surface">{cat.name}</span>
                      {usage > 0 && (
                        <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                          {usage} uso{usage !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={() => startEdit(cat)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition"
                        title="Renombrar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${
                          usage > 0
                            ? 'text-on-surface-variant/40 cursor-not-allowed'
                            : 'text-on-surface-variant hover:bg-error-container hover:text-error'
                        }`}
                        title={usage > 0 ? 'En uso, no se puede eliminar' : 'Eliminar'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add category */}
          <div className="flex gap-2 pt-1">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
              placeholder={`Nueva categoría de ${catTab === 'INCOME' ? 'ingresos' : 'egresos'}...`}
              className="flex-1 bg-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant border border-outline-variant/20 focus:outline-none focus:border-secondary"
            />
            <button
              onClick={addCategory}
              disabled={addingCat || !newCatName.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-on-secondary hover:opacity-90 transition disabled:opacity-50"
            >
              <Plus size={15} />
              {addingCat ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </section>

        {/* ── Users table ─────────────────────────────────────────────────── */}
        <section className="rounded-[24px] bg-surface-container border border-outline-variant/20 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-secondary" />
            <h2 className="font-semibold text-base">Usuarios registrados</h2>
            <span className="ml-auto text-xs text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">
              {users.length} total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="text-left py-3 px-2 text-xs uppercase tracking-wider text-on-surface-variant font-medium">#</th>
                  <th className="text-left py-3 px-2 text-xs uppercase tracking-wider text-on-surface-variant font-medium">Nombre</th>
                  <th className="text-left py-3 px-2 text-xs uppercase tracking-wider text-on-surface-variant font-medium">Email</th>
                  <th className="text-left py-3 px-2 text-xs uppercase tracking-wider text-on-surface-variant font-medium">Actividad</th>
                  <th className="text-left py-3 px-2 text-xs uppercase tracking-wider text-on-surface-variant font-medium">Registro</th>
                  <th className="py-3 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {users.map((u, i) => (
                  <tr key={u.id} className="hover:bg-surface-container-high transition">
                    <td className="py-3.5 px-2 text-on-surface-variant text-xs">{i + 1}</td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm shrink-0">
                          {u.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{u.name}</p>
                          {u.isAdmin && (
                            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider">Admin</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-on-surface-variant text-xs">{u.email}</td>
                    <td className="py-3.5 px-2">
                      <div className="flex gap-3 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="text-emerald-500">↑</span>{u._count.incomes}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-error">↓</span>{u._count.expenses}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-on-surface-variant text-xs whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                    <td className="py-3.5 px-2">
                      {!u.isAdmin ? (
                        <button
                          onClick={() => deleteUser(u.id, u.name)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-error-container text-on-surface-variant hover:text-error transition"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center">
                          <UserCircle size={14} className="text-secondary opacity-60" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="py-12 text-center text-on-surface-variant text-sm">
                Sin usuarios registrados.
              </div>
            )}
          </div>
        </section>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <section className="rounded-[24px] bg-surface-container border border-outline-variant/20 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Info size={18} className="text-secondary" />
            <h2 className="font-semibold text-base">Acerca de</h2>
          </div>

          {/* App summary */}
          <div className="rounded-2xl bg-secondary/10 border border-secondary/20 px-5 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-secondary" />
              <p className="font-bold text-secondary text-sm tracking-wide">Lumina Finance</p>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Aplicación de finanzas personales premium orientada al mercado colombiano (COP).
              Permite gestionar ingresos, gastos, deudas, metas, presupuestos y tarjetas de crédito
              con compras en cuotas — todo en un solo lugar, con dashboard inteligente, historial
              filtrable y panel de administración.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Next.js 15', 'TypeScript', 'Prisma', 'PostgreSQL', 'Tailwind CSS v4', 'Docker'].map((t) => (
                <span key={t} className="text-[11px] font-medium bg-secondary/15 text-secondary px-2.5 py-1 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Developer */}
          <div className="flex items-start gap-4 rounded-2xl bg-surface-container-high px-5 py-4">
            <div className="w-14 h-14 shrink-0 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-xl select-none">
              D
            </div>
            <div className="space-y-1">
              <p className="font-bold text-on-surface">Diego Andrés De la Hoz Ballena</p>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wider">Ingeniero de Sistemas · 23 años</p>
              <p className="text-sm text-on-surface-variant leading-relaxed pt-1">
                Desarrollé Lumina Finance como proyecto personal para llevar el control de mis finanzas
                de forma ordenada y visual. Quería una herramienta hecha a la medida del mercado colombiano,
                con soporte para COP, tarjetas de crédito en cuotas y una experiencia de usuario premium.
                Es también un espacio para explorar y aplicar tecnologías modernas de desarrollo web full-stack.
              </p>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant text-center">
            Versión 1.0 · 2026 · Hecho con dedicación 🇨🇴
          </p>
        </section>

      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, color, bg, mono,
}: { icon: React.ElementType; label: string; value: string; color: string; bg: string; mono?: boolean }) {
  return (
    <div className="rounded-[20px] bg-surface-container border border-outline-variant/20 p-5 space-y-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">{label}</p>
        <p className={`text-xl font-bold ${color} ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
