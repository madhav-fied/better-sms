'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { NAV_ITEMS } from '@/constants/nav';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const { role } = useRole();
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);

  const items = useMemo(
    () => NAV_ITEMS.filter((i) => role && i.roles.includes(role)),
    [role],
  );

  useEffect(() => {
    const activeParent = items.find((item) =>
      item.children?.some((child) => isActive(pathname, child.href)),
    );
    if (activeParent) {
      setOpen(activeParent.href);
    }
  }, [pathname, items]);

  return (
    <aside className="flex w-60 min-h-screen shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School Management</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">Edulink</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {items.map((item) => {
          const childActive = item.children?.some((child) => isActive(pathname, child.href));
          const itemActive = !item.children && isActive(pathname, item.href);

          return (
            <div key={item.href}>
              {item.children ? (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen(open === item.href ? null : item.href)}
                    aria-expanded={open === item.href}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                      childActive
                        ? 'border-slate-200 bg-slate-50 text-slate-900'
                        : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <span>{item.label}</span>
                    {open === item.href ? (
                      <ChevronDown size={16} className="text-slate-500" aria-hidden />
                    ) : (
                      <ChevronRight size={16} className="text-slate-500" aria-hidden />
                    )}
                  </button>
                  {open === item.href && (
                    <div className="mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3 ml-2">
                      {item.children.map((child) => {
                        const active = isActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'block rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                              active
                                ? 'border-slate-200 bg-slate-100 text-slate-900 shadow-sm'
                                : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                            )}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  aria-current={itemActive ? 'page' : undefined}
                  className={cn(
                    'block rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                    itemActive
                      ? 'border-slate-200 bg-slate-100 text-slate-900 shadow-sm'
                      : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50',
                  )}
                >
                  {item.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
