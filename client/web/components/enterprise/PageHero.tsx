import { cn } from '@/lib/utils';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function PageHero({ title, subtitle, className }: PageHeroProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 shadow-sm',
        className,
      )}
    >
      <svg
        className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 text-blue-100"
        viewBox="0 0 120 120"
        aria-hidden
      >
        <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.5" />
        <rect x="30" y="35" width="60" height="45" rx="6" fill="white" stroke="currentColor" strokeWidth="2" opacity="0.8" />
        <path d="M40 55h40M40 65h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </svg>
      <div className="relative">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}
