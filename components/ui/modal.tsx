'use client';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, subtitle, onClose, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl bg-surface">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-outline-variant/15">
          <div>
            <h2 className="text-lg font-semibold text-on-surface leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-container-low hover:bg-surface-container-high transition text-on-surface-variant"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(100dvh - 200px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
