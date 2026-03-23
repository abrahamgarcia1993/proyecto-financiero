'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/client-api';

export default function RequestAccessPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      reason: String(formData.get('reason') || ''),
      financialLevel: String(formData.get('financialLevel') || '')
    };

    setLoading(true);
    setError('');

    try {
      await apiRequest('/auth/request-access', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setDone(true);
      event.currentTarget.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 md:px-6">
      <Link href="/" className="ghost-btn text-sm">
        Volver al inicio
      </Link>
      <section className="card mt-4">
        <h1 className="text-3xl font-semibold">Solicitar acceso privado</h1>
        <p className="mt-2 text-sm text-stone-600">
          Completa este formulario para acceder a la plataforma. Un administrador aprobara o
          rechazara manualmente tu solicitud.
        </p>

        <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
          <div>
            <label className="label">Nombre</label>
            <input className="field" name="name" required />
          </div>
          <div>
            <label className="label">Correo electronico</label>
            <input className="field" type="email" name="email" required />
          </div>
          <div>
            <label className="label">Nivel financiero actual</label>
            <select className="field" name="financialLevel" required>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </div>
          <div>
            <label className="label">Motivo</label>
            <textarea className="field min-h-[110px]" name="reason" required />
          </div>
          <button className="primary-btn" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar solicitud de acceso'}
          </button>
        </form>

        {done ? <p className="mt-4 text-sm text-green-700">Solicitud enviada. Recibiras una invitacion cuando sea aprobada.</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
