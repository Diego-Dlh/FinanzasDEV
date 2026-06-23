'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastCtx {
  success: (message: string) => void;
  error: (message: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastCtx | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, variant: ToastVariant) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  const ctx: ToastCtx = {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires ToastProvider');
  return ctx;
}

// ── Container + individual toast ──────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(show);
  }, []);

  const isSuccess = toast.variant === 'success';

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg border transition-all duration-300 max-w-[320px]
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
        ${isSuccess
          ? 'bg-secondary-container border-secondary/20 text-on-secondary-container'
          : 'bg-error-container border-error/20 text-on-error-container'
        }`}
    >
      {isSuccess
        ? <CheckCircle2 size={16} className="shrink-0 text-secondary" />
        : <XCircle size={16} className="shrink-0 text-error" />
      }
      <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
