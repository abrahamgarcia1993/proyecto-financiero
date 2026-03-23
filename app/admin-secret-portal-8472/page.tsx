'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiRequest } from '@/lib/client-api';

type AccessRequest = {
  id: string;
  name: string;
  email: string;
  reason: string;
  financialLevel: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type UserData = {
  user: {
    id: string;
    role: 'user' | 'admin';
  };
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  accountExpiresAt: string | null;
  mustChangePassword: boolean;
  deletedAt: string | null;
};

type AdminUsersResponse = {
  activeUsers: ManagedUser[];
  deletedUsers: ManagedUser[];
};

type PendingDeleteUser = {
  id: string;
  name: string;
  email: string;
};

export default function AdminPortalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<ManagedUser[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'pending' | 'resolved'>('pending');
  const [levelByUser, setLevelByUser] = useState<Record<string, number>>({});
  const [monthsByUser, setMonthsByUser] = useState<Record<string, number>>({});
  const [adminMsgByUser, setAdminMsgByUser] = useState<Record<string, string>>({});
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<PendingDeleteUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      window.location.href = '/';
      return;
    }
    setToken(stored);
  }, []);

  async function loadData(authToken: string) {
    try {
      setError('');
      const me = await apiRequest<UserData>('/auth/me', {}, authToken);
      if (me.user.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }

      const list = await apiRequest<AccessRequest[]>('/admin/requests', {}, authToken);
      setRequests(list);

      const usersData = await apiRequest<AdminUsersResponse>(
        '/admin/users',
        {},
        authToken
      );
      setUsers(usersData.activeUsers);
      setDeletedUsers(usersData.deletedUsers);

      setLevelByUser((current) => {
        const next = { ...current };
        for (const user of usersData.activeUsers) {
          if (typeof next[user.id] !== 'number') {
            next[user.id] = 2;
          }
        }
        return next;
      });

      setMonthsByUser((current) => {
        const next = { ...current };
        for (const user of usersData.activeUsers) {
          if (typeof next[user.id] !== 'number') {
            next[user.id] = 12;
          }
        }
        return next;
      });
    } catch (err) {
      const message = (err as Error).message;
      if (message === 'Prohibido') {
        window.location.href = '/dashboard';
        return;
      }
      if (message === 'No autorizado') {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
      setError(message);
    } finally {
      setAccessChecked(true);
    }
  }

  useEffect(() => {
    if (token) {
      void loadData(token);
    }
  }, [token]);

  async function updateRequest(requestId: string, status: 'approved' | 'rejected') {
    if (!token) return;
    await apiRequest('/admin/requests', {
      method: 'PATCH',
      body: JSON.stringify({ requestId, status })
    }, token);
    await loadData(token);
  }

  async function unlockLevelForUser(userId: string) {
    if (!token || !userId) return;
    const selectedLevel = Math.min(5, Math.max(1, Number(levelByUser[userId] || 2)));

    setAdminMsgByUser((current) => ({ ...current, [userId]: '' }));
    await apiRequest('/admin/unlock-level', {
      method: 'POST',
      body: JSON.stringify({ userId, level: selectedLevel })
    }, token);

    setAdminMsgByUser((current) => ({
      ...current,
      [userId]: `Nivel ${selectedLevel} desbloqueado correctamente.`
    }));
    await loadData(token);
  }

  async function extendAccountForUser(userId: string) {
    if (!token || !userId) return;
    const extendMonths = Math.min(60, Math.max(1, Number(monthsByUser[userId] || 12)));

    setAdminMsgByUser((current) => ({ ...current, [userId]: '' }));
    await apiRequest('/admin/extend-account', {
      method: 'POST',
      body: JSON.stringify({ userId, months: extendMonths })
    }, token);

    setAdminMsgByUser((current) => ({
      ...current,
      [userId]: `Cuenta ampliada ${extendMonths} mes(es).`
    }));
    await loadData(token);
  }

  function requestDeleteUser(user: ManagedUser) {
    setPendingDeleteUser({ id: user.id, name: user.name, email: user.email });
  }

  async function confirmDeleteUserAccount() {
    if (!token || !pendingDeleteUser) return;
    const userId = pendingDeleteUser.id;

    try {
      setDeletingUserId(userId);
      setAdminMsgByUser((current) => ({ ...current, [userId]: '' }));
      await apiRequest('/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ userId })
      }, token);

      setAdminMsgByUser((current) => ({
        ...current,
        [userId]: 'Cuenta eliminada correctamente.'
      }));
      setPendingDeleteUser(null);
      await loadData(token);
    } finally {
      setDeletingUserId(null);
    }
  }

  function formatExpiry(value: string | null) {
    if (!value) return 'Sin fecha';
    return new Date(value).toLocaleDateString('es-ES');
  }

  function formatFinancialLevel(level: string) {
    const normalized = level.toLowerCase();
    if (normalized === 'beginner') return 'Principiante';
    if (normalized === 'intermediate') return 'Intermedio';
    if (normalized === 'advanced') return 'Avanzado';
    if (normalized === 'principiante') return 'Principiante';
    if (normalized === 'intermedio') return 'Intermedio';
    if (normalized === 'avanzado') return 'Avanzado';
    return level;
  }

  const activeUsers = users;
  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const approvedCount = requests.filter((request) => request.status === 'approved').length;
  const rejectedCount = requests.filter((request) => request.status === 'rejected').length;
  const filteredRequests = requests.filter((request) =>
    requestFilter === 'pending'
      ? request.status === 'pending'
      : request.status === 'approved' || request.status === 'rejected'
  );

  if (!accessChecked) {
    return (
      <AppShell
        title="Portal secreto de administracion"
        subtitle="Verificando acceso de administrador"
        showAdminLink
        onLogout={() => {
          localStorage.removeItem('token');
          window.location.href = '/';
        }}
      >
        <section className="card">
          <p className="text-sm text-slate-600">Comprobando permisos...</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Portal secreto de administracion"
      subtitle="Aprueba solicitudes de acceso y desbloquea niveles educativos"
      showAdminLink
      onLogout={() => {
        localStorage.removeItem('token');
        window.location.href = '/';
      }}
    >
      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-2xl border border-sky-100 bg-white/90 p-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Solicitudes pendientes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/90 p-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Solicitudes aprobadas</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{approvedCount}</p>
        </article>
        <article className="rounded-2xl border border-rose-100 bg-rose-50/90 p-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.14em] text-rose-700">Solicitudes rechazadas</p>
          <p className="mt-1 text-2xl font-semibold text-rose-800">{rejectedCount}</p>
        </article>
        <article className="rounded-2xl border border-indigo-100 bg-indigo-50/90 p-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.14em] text-indigo-700">Cuentas aprobadas</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{activeUsers.length}</p>
        </article>
        <article className="rounded-2xl border border-rose-100 bg-rose-50/90 p-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.14em] text-rose-700">Cuentas eliminadas</p>
          <p className="mt-1 text-2xl font-semibold text-rose-800">{deletedUsers.length}</p>
        </article>
      </section>

      <section className="card mt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Solicitudes de acceso</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              Total: {requests.length}
            </span>
            <button
              className="ghost-btn px-3 py-1 text-xs"
              onClick={() => setShowRequests((current) => !current)}
            >
              {showRequests ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>
        {showRequests ? (
          <div className="mt-3 space-y-3">
            <div className="mb-1 flex flex-wrap gap-2">
              <button
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                  requestFilter === 'pending'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setRequestFilter('pending')}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                  requestFilter === 'resolved'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setRequestFilter('resolved')}
              >
                Aprobadas + Rechazadas ({approvedCount + rejectedCount})
              </button>
            </div>

            {filteredRequests.map((request) => (
              <article
                key={request.id}
                className={`mx-auto w-full max-w-4xl rounded-xl border p-3 ${
                  request.status === 'approved'
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : request.status === 'rejected'
                      ? 'border-rose-200 bg-rose-50/60'
                      : 'border-amber-200 bg-amber-50/70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{request.name} - {request.email}</p>
                  <span className={`rounded-full px-2 py-1 text-xs ${
                    request.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : request.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {request.status === 'approved' ? 'aprobada' : request.status === 'rejected' ? 'rechazada' : 'pendiente'}
                  </span>
                </div>
                <p className="text-sm text-slate-600">Nivel financiero: {formatFinancialLevel(request.financialLevel)}</p>
                <p className="text-sm text-slate-600">Motivo: {request.reason}</p>

                {request.status === 'approved' ? (
                  <div className="mt-2 rounded-lg bg-green-50 p-2 text-xs text-green-800">
                    Cuenta activada. Se envio una contrasena temporal al correo del usuario.
                  </div>
                ) : null}

                {request.status === 'pending' ? (
                  <div className="mt-3 flex justify-center gap-2">
                    <button className="primary-btn text-sm" onClick={() => updateRequest(request.id, 'approved')}>
                      Aprobar
                    </button>
                    <button className="ghost-btn text-sm" onClick={() => updateRequest(request.id, 'rejected')}>
                      Rechazar
                    </button>
                  </div>
                ) : null}
              </article>
            ))}

            {filteredRequests.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay solicitudes para el filtro seleccionado.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Seccion oculta. Pulsa en Mostrar para ver las solicitudes.</p>
        )}
      </section>

      <section className="card mt-4">
        <h2 className="text-lg font-semibold text-slate-800">Cuentas aprobadas</h2>
        <p className="mt-1 text-sm text-slate-600">
          Usuarios con cuenta aprobada por admin. Puedes modificarlos desde su propia tarjeta.
        </p>

        <div className="mt-4 space-y-3">
          {activeUsers.map((user) => (
            <article key={user.id} className="mx-auto w-full max-w-4xl rounded-xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/50 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {user.name} - {user.email}
                </p>
                <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                  Vence: {formatExpiry(user.accountExpiresAt)}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Estado de seguridad: {user.mustChangePassword ? 'Debe cambiar contrasena temporal' : 'Contrasena establecida'}
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3">
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-cyan-700">Educacion</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <input
                      className="field mt-0 w-24"
                      type="number"
                      min={1}
                      max={5}
                      value={levelByUser[user.id] ?? 2}
                      onChange={(e) => setLevelByUser((current) => ({
                        ...current,
                        [user.id]: Number(e.target.value)
                      }))}
                    />
                    <button className="primary-btn min-w-44" onClick={() => unlockLevelForUser(user.id)}>
                      Desbloquear nivel
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Vigencia</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <input
                      className="field mt-0 w-24"
                      type="number"
                      min={1}
                      max={60}
                      value={monthsByUser[user.id] ?? 12}
                      onChange={(e) => setMonthsByUser((current) => ({
                        ...current,
                        [user.id]: Number(e.target.value)
                      }))}
                    />
                    <button className="primary-btn min-w-44" onClick={() => extendAccountForUser(user.id)}>
                      Ampliar cuenta
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-center">
                <button
                  className="danger-btn min-w-44"
                  onClick={() => requestDeleteUser(user)}
                  disabled={deletingUserId === user.id}
                >
                  {deletingUserId === user.id ? 'Eliminando cuenta...' : 'Eliminar cuenta'}
                </button>
              </div>

              {adminMsgByUser[user.id] ? (
                <p className="mt-2 text-sm text-green-700">{adminMsgByUser[user.id]}</p>
              ) : null}
            </article>
          ))}

          {activeUsers.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no hay cuentas aprobadas.</p>
          ) : null}
        </div>
      </section>

      <section className="card mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Cuentas eliminadas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Cuentas retiradas por el administrador.
            </p>
          </div>
          <button className="ghost-btn px-3 py-1 text-xs" onClick={() => setShowDeletedUsers((current) => !current)}>
            {showDeletedUsers ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {showDeletedUsers ? (
          <div className="mt-4 space-y-3">
            {deletedUsers.map((user) => (
              <article key={`deleted-${user.id}`} className="mx-auto w-full max-w-4xl rounded-xl border border-rose-100 bg-rose-50/60 p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">
                    {user.name} - {user.email}
                  </p>
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                    Eliminada: {user.deletedAt ? new Date(user.deletedAt).toLocaleDateString('es-ES') : '-'}
                  </span>
                </div>
              </article>
            ))}

            {deletedUsers.length === 0 ? (
              <p className="text-sm text-slate-600">Aun no hay cuentas eliminadas.</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Seccion oculta. Pulsa en Mostrar para verlas.</p>
        )}
      </section>

      {pendingDeleteUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 shadow-soft">
            <h3 className="text-lg font-semibold text-rose-700">Confirmar eliminacion</h3>
            <p className="mt-2 text-sm text-slate-700">
              Vas a eliminar la cuenta de <strong>{pendingDeleteUser.name}</strong> ({pendingDeleteUser.email}).
              Esta accion no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="ghost-btn"
                onClick={() => setPendingDeleteUser(null)}
                disabled={deletingUserId === pendingDeleteUser.id}
              >
                Cancelar
              </button>
              <button
                className="danger-btn"
                onClick={confirmDeleteUserAccount}
                disabled={deletingUserId === pendingDeleteUser.id}
              >
                {deletingUserId === pendingDeleteUser.id ? 'Eliminando...' : 'Confirmar eliminacion'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </AppShell>
  );
}
