import Link from 'next/link';

type Props = {
  title: string;
  subtitle: string;
  headerBadgeText?: string;
  children: React.ReactNode;
  onLogout?: () => void;
  showAdminLink?: boolean;
};

export function AppShell({ title, subtitle, headerBadgeText, children, onLogout, showAdminLink = false }: Props) {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100/80 bg-white/85 p-4 shadow-soft backdrop-blur md:p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-700">Control Financiero</p>
          <h1 className="text-2xl font-semibold text-slate-800 md:text-4xl">{title}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
          {headerBadgeText ? (
            <p className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              {headerBadgeText}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard" className="ghost-btn text-sm">
            Panel
          </Link>
          <Link href="/educacion" className="ghost-btn text-sm">
            Educacion
          </Link>
          {showAdminLink ? (
            <Link href="/admin-secret-portal-8472" className="ghost-btn text-sm">
              Administracion
            </Link>
          ) : null}
          {onLogout ? (
            <button className="primary-btn text-sm" onClick={onLogout}>
              Cerrar sesion
            </button>
          ) : null}
        </div>
      </header>
      {children}
    </main>
  );
}
