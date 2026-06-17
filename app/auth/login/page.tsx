'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/hooks/useAuth';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input, Btn } from '@/components/ui/field';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al iniciar sesión');
      login(json.token, json.user);
      router.replace('/');
    } catch (err) {
      setError('root', { message: (err as Error).message });
    }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-container text-white text-2xl font-bold mx-auto">L</div>
          <p className="text-[12px] uppercase tracking-[0.25em] text-on-surface-variant">Bienvenido de vuelta</p>
          <h1 className="text-3xl font-semibold text-on-surface">Inicia sesión</h1>
          <p className="text-sm text-on-surface-variant">Accede a tu panel financiero personal.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-[24px] bg-white p-7 shadow-card border border-outline-variant/10">
          {errors.root && (
            <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
              {errors.root.message}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">Correo electrónico</label>
            <Input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
            />
            {errors.email && <p className="mt-1.5 text-xs font-medium text-error">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">Contraseña</label>
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs font-medium text-error">{errors.password.message}</p>}
          </div>

          <Btn type="submit" variant="primary" loading={isSubmitting} className="w-full">
            Ingresar
          </Btn>

          <p className="text-center text-sm text-on-surface-variant">
            ¿No tienes cuenta?{' '}
            <Link href="/auth/register" className="text-secondary font-semibold hover:underline">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
