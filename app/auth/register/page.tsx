'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/hooks/useAuth';
import { registerSchema, type RegisterInput } from '@/lib/validators';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input, Btn } from '@/components/ui/field';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    try {
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const regJson = await regRes.json();
      if (!regRes.ok) throw new Error(regJson.error || 'Error al registrarse');

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const loginJson = await loginRes.json();
      if (!loginRes.ok) throw new Error('Registro exitoso, inicia sesión manualmente');

      login(loginJson.token, loginJson.user);
      router.replace('/');
    } catch (err) {
      setError('root', { message: (err as Error).message });
    }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-white text-2xl font-bold mx-auto">L</div>
          <p className="text-[12px] uppercase tracking-[0.25em] text-on-surface-variant">Comienza hoy</p>
          <h1 className="text-3xl font-semibold text-on-surface">Crear cuenta</h1>
          <p className="text-sm text-on-surface-variant">Tu plataforma financiera premium te espera.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-[28px] bg-white p-7 shadow-card border border-outline-variant/10">
          {errors.root && (
            <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
              {errors.root.message}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">Nombre completo</label>
            <Input {...register('name')} autoComplete="name" placeholder="Tu nombre" />
            {errors.name && <p className="mt-1.5 text-xs font-medium text-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">Correo electrónico</label>
            <Input {...register('email')} type="email" autoComplete="email" placeholder="tu@correo.com" />
            {errors.email && <p className="mt-1.5 text-xs font-medium text-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">Contraseña</label>
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
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

          <Btn type="submit" variant="secondary" loading={isSubmitting} className="w-full">
            Crear cuenta
          </Btn>

          <p className="text-center text-sm text-on-surface-variant">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Ingresar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
