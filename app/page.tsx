'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    mustChangePassword: boolean;
  };
};

export default function HomePage() {
  const router = useRouter();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('token', data.token);
      router.push(data.user.role === 'admin' ? '/admin-secret-portal-8472' : '/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 md:px-6">
      <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-brand">MVP en Produccion</p>
          <h1 className="text-3xl font-semibold md:text-5xl">Plataforma Financiera Privada</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600 md:text-base">
            El admin activa tu cuenta y recibes una contrasena temporal por correo.
            En tu primer acceso podras cambiarla desde el panel.
          </p>
        </div>
        <Link href="/request-access" className="primary-btn text-sm">
          Solicitar acceso
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="card">
          <h2 className="mb-4 text-xl font-semibold">Iniciar sesion</h2>
          <form className="space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="label">Correo electronico</label>
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Contrasena</label>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="primary-btn w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </article>

        <article className="card">
          <h2 className="text-xl font-semibold">Acceso privado por aprobacion</h2>
          <p className="mt-4 text-sm text-stone-500">
            Flujo: solicitud de acceso, aprobacion del admin y envio automatico de contrasena temporal al usuario.
            Despues del primer acceso, el usuario debe cambiar su contrasena.
          </p>
        </article>
      </section>
    </main>
  );
}
