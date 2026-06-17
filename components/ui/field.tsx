'use client';
import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-2xl bg-surface-container-low px-4 py-3.5 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40 focus:bg-white focus:ring-2 focus:ring-secondary/30 focus:shadow-sm disabled:opacity-50 ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// ─── SelectField ─────────────────────────────────────────────────────────────
export const SelectField = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={`w-full appearance-none rounded-2xl bg-surface-container-low px-4 py-3.5 pr-10 text-sm text-on-surface outline-none transition-all cursor-pointer focus:bg-white focus:ring-2 focus:ring-secondary/30 focus:shadow-sm disabled:opacity-50 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
      />
    </div>
  )
);
SelectField.displayName = 'SelectField';

// ─── FieldLabel ───────────────────────────────────────────────────────────────
export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-1.5">
      {children}
      {required && <span className="text-error ml-0.5">*</span>}
    </label>
  );
}

// ─── FieldError ───────────────────────────────────────────────────────────────
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-error">{message}</p>;
}

// ─── Field (wrapper: label + input/select + error) ────────────────────────────
export function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
      <FieldError message={error} />
    </div>
  );
}

// ─── Btn ─────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  loading?: boolean;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const variantCls: Record<BtnVariant, string> = {
  primary:   'bg-primary text-on-primary hover:bg-primary/90',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90',
  danger:    'bg-error text-on-error hover:bg-error/90',
  ghost:     'bg-surface-container text-on-surface hover:bg-surface-container-high',
};

const sizeCls = {
  sm: 'h-10 px-4 text-xs gap-1.5 rounded-xl',
  md: 'h-12 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-sm gap-2 rounded-2xl',
};

export function Btn({ variant = 'primary', loading, icon, size = 'lg', className = '', children, disabled, ...rest }: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${variantCls[variant]} ${sizeCls[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
