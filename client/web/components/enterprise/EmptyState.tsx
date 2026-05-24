import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
        <svg viewBox="0 0 64 64" className="h-8 w-8 text-slate-400" aria-hidden>
          <rect x="12" y="16" width="40" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 28h24M20 36h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
