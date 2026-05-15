'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { NAV_ITEMS } from '@/constants/nav';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  const { role } = useRole();
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);

  const items = NAV_ITEMS.filter((i) => role && i.roles.includes(role));

  return (
    <aside className="w-56 bg-gray-900 text-gray-100 min-h-screen flex flex-col shrink-0">
      <div className="px-4 py-5 font-semibold text-base border-b border-gray-700">
        SKEducations
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <div key={item.href}>
            {item.children ? (
              <>
                <button
                  onClick={() => setOpen(open === item.href ? null : item.href)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-sm hover:bg-gray-800 text-gray-200"
                >
                  {item.label}
                  {open === item.href ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                </button>
                {open === item.href && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={`block px-3 py-1.5 rounded text-sm ${
                          pathname === c.href
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={`block px-3 py-2 rounded text-sm ${
                  pathname === item.href
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-200 hover:bg-gray-800'
                }`}
              >
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
