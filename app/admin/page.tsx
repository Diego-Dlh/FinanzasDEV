'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, RefreshCw, Trash2, Shield, KeyRound, LogOut, ChevronRight,
  UserCircle, Calendar, BarChart2, ArrowLeft,
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
  const [ready, setReady]     = useState(false);
  const [error, setError]     = useState('');
  const [stats, setStats]     = useState<Stats | null>(null);
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [key, setKey]         = useState<ActiveKey | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [newCode, setNewCode] = useState('');

  const load = useCallback(async () => {
    try {
      const [statsRes, usersRes, keyRes] = await Promise.all([
        apiFetch<Stats>('/admin/stats'),
        apiFetch<{ users: AdminUser[] }>('/admin/usuarios'),
        apiFetch<{ key: ActiveKey | null }>('/admin/clave'),
      ]);
      setStats(statsRes);
      setUsers(usersRes.users);
      setKey(keyRes.key);
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

  const activeKey = key;

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
            value={activeKey?.code ?? 'Sin clave'}
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

          {activeKey ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                {activeKey.code.split('').map((char, i) => (
                  <div
                    key={i}
                    className="w-12 h-14 rounded-xl bg-secondary/10 border border-secondary/30 flex items-center justify-center text-2xl font-bold text-secondary font-mono tracking-widest select-all"
                  >
                    {char}
                  </div>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant">
                Generada el {fmtDate(activeKey.createdAt)}
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
