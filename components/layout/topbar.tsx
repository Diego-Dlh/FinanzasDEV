'use client';
import { useState, useEffect } from 'react';
import { Bell, LogOut, Moon, Sun, Lock, Trash2, CheckCheck, X, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTheme } from '@/lib/hooks/useTheme';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validators';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Btn } from '@/components/ui/field';

interface Alert {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export function TopBar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { isDark, toggle, setDark } = useTheme();
  const router = useRouter();

  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const pwForm = useForm<ChangePasswordInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(changePasswordSchema) as any,
  });

  // Load alerts + unread count on mount
  useEffect(() => {
    if (!user) return;
    api.get<{ alerts: Alert[]; unreadCount: number }>('/alertas')
      .then((res) => {
        setAlerts(res.alerts);
        setUnreadCount(res.unreadCount);
      })
      .catch(() => {});
  }, [user]);

  function handleLogout() {
    logout();
    router.push('/auth/login');
  }

  async function handleDarkToggle() {
    const next = !isDark;
    toggle();
    try {
      await api.put('/configuracion', { darkMode: next });
    } catch {}
  }

  async function handleMarkAllRead() {
    await api.put('/alertas', { markAllRead: true });
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setUnreadCount(0);
  }

  async function handleMarkOneRead(id: string) {
    await api.put(`/alertas/${id}`, {});
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    setUnreadCount((n) => Math.max(0, n - 1));
  }

  async function handleDeleteAlert(id: string) {
    const wasUnread = alerts.find((a) => a.id === id)?.read === false;
    await api.delete(`/alertas/${id}`);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (wasUnread) setUnreadCount((n) => Math.max(0, n - 1));
  }

  async function onChangePassword(data: ChangePasswordInput) {
    setPwError('');
    setPwSuccess('');
    try {
      await api.put('/auth/cambiar-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPwSuccess('Contraseña actualizada correctamente.');
      pwForm.reset();
    } catch (e) {
      setPwError((e as Error).message);
    }
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? 'U';

  return (
    <>
      <header className="fixed top-0 left-0 z-50 w-full lg:left-60 lg:w-[calc(100%-240px)] border-b border-outline-variant/10 bg-surface/90 backdrop-blur-xl px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          {/* Avatar (opens settings) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-on-secondary font-semibold text-lg select-none hover:opacity-90 transition"
              aria-label="Configuración"
            >
              {initial}
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-on-surface-variant">
                {user ? `Hola, ${user.name.split(' ')[0]}` : 'Bienvenido'}
              </p>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container shadow-sm transition hover:opacity-90"
              aria-label="Notificaciones"
            >
              <Bell size={20} className="text-on-surface" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-on-error text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Logout */}
            {user && (
              <button
                onClick={handleLogout}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container shadow-sm transition hover:bg-error-container hover:text-error"
                aria-label="Cerrar sesión"
              >
                <LogOut size={18} className="text-on-surface-variant" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Settings modal ─────────────────────────────────────────────────── */}
      {showSettings && (
        <Modal title="Configuración" onClose={() => { setShowSettings(false); setPwSuccess(''); setPwError(''); pwForm.reset(); }}>
          <div className="space-y-6">

            {/* Admin panel shortcut */}
            {user?.isAdmin && (
              <button
                onClick={() => { setShowSettings(false); router.push('/admin'); }}
                className="flex w-full items-center gap-3 rounded-2xl bg-secondary/10 border border-secondary/20 px-4 py-3.5 text-left transition hover:bg-secondary/15"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/20">
                  <Shield size={16} className="text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-secondary">Panel de Administrador</p>
                  <p className="text-xs text-on-surface-variant">Gestión de usuarios y claves</p>
                </div>
              </button>
            )}

            {/* Profile */}
            <div className="flex items-center gap-4 rounded-2xl bg-surface-container-low px-4 py-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary font-bold text-xl select-none">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-on-surface truncate">{user?.name}</p>
                <p className="text-sm text-on-surface-variant truncate">{user?.email}</p>
              </div>
            </div>

            {/* Dark mode */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant mb-3">Apariencia</p>
              <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-4">
                <div className="flex items-center gap-3">
                  {isDark ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-on-surface-variant" />}
                  <div>
                    <p className="text-sm font-medium text-on-surface">Modo oscuro</p>
                    <p className="text-xs text-on-surface-variant">{isDark ? 'Activado' : 'Desactivado'}</p>
                  </div>
                </div>
                {/* Toggle switch */}
                <button
                  onClick={handleDarkToggle}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                    isDark ? 'bg-secondary' : 'bg-surface-container-highest'
                  }`}
                  aria-checked={isDark}
                  role="switch"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      isDark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Change password */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant mb-3">Seguridad</p>
              <div className="rounded-2xl bg-surface-container-low px-4 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={16} className="text-on-surface-variant" />
                  <p className="text-sm font-medium text-on-surface">Cambiar contraseña</p>
                </div>

                {pwSuccess && (
                  <div className="mb-3 rounded-xl bg-secondary-container px-3 py-2.5 text-sm text-on-secondary-container">
                    {pwSuccess}
                  </div>
                )}
                {pwError && (
                  <div className="mb-3 rounded-xl bg-error-container px-3 py-2.5 text-sm text-on-error-container">
                    {pwError}
                  </div>
                )}

                <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-3">
                  <Field label="Contraseña actual" error={pwForm.formState.errors.currentPassword?.message} required>
                    <Input {...pwForm.register('currentPassword')} type="password" placeholder="••••••" />
                  </Field>
                  <Field label="Nueva contraseña" error={pwForm.formState.errors.newPassword?.message} required>
                    <Input {...pwForm.register('newPassword')} type="password" placeholder="Mínimo 6 caracteres" />
                  </Field>
                  <Field label="Confirmar contraseña" error={pwForm.formState.errors.confirmPassword?.message} required>
                    <Input {...pwForm.register('confirmPassword')} type="password" placeholder="Repite la nueva contraseña" />
                  </Field>
                  <Btn
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={pwForm.formState.isSubmitting}
                    className="w-full"
                  >
                    Actualizar contraseña
                  </Btn>
                </form>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* ── Notifications modal ────────────────────────────────────────────── */}
      {showNotifications && (
        <Modal
          title="Notificaciones"
          subtitle={unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
          onClose={() => setShowNotifications(false)}
        >
          <div className="space-y-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant/30 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition"
              >
                <CheckCheck size={16} />
                Marcar todas como leídas
              </button>
            )}

            {alerts.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={36} className="mx-auto mb-3 text-on-surface-variant opacity-30" />
                <p className="text-sm text-on-surface-variant">No tienes notificaciones.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 transition ${
                    alert.read
                      ? 'bg-surface-container-low'
                      : 'bg-primary-container'
                  }`}
                >
                  {!alert.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <p className={`flex-1 text-sm leading-relaxed ${alert.read ? 'text-on-surface-variant' : 'text-on-primary-container'}`}>
                    {alert.message}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    {!alert.read && (
                      <button
                        onClick={() => handleMarkOneRead(alert.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-surface-container transition text-on-surface-variant"
                        title="Marcar como leída"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-error-container hover:text-error transition text-on-surface-variant"
                      title="Eliminar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
