interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 p-4">
      <svg className="pointer-events-none absolute right-0 top-0 h-64 w-64 text-blue-100" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="80" fill="currentColor" opacity="0.4" />
      </svg>
      <svg className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 text-slate-200" viewBox="0 0 160 160" aria-hidden>
        <rect x="20" y="40" width="120" height="80" rx="8" fill="currentColor" opacity="0.5" />
      </svg>
      <div className="relative w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School Management</p>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}
