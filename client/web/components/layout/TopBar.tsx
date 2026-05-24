'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { ROLE_LABELS } from '@/constants/roles';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { storage } from '@/lib/storage';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { LogOut, UserCircle } from 'lucide-react';

export default function TopBar() {
  const { clearSession, role } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: schools } = useQuery({
    queryKey: ['schools-picker'],
    queryFn: () => apiClient.get('/schools').then((r) => r.data?.data ?? []),
    enabled: role === 'superadmin',
  });

  const activeSchoolId = storage.getActiveSchoolId();

  const logout = () => {
    clearSession();
    router.replace('/login');
  };

  const onSchoolChange = (schoolId: string) => {
    storage.setActiveSchoolId(schoolId);
    qc.invalidateQueries();
    router.refresh();
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">Welcome back</p>
        <p className="text-xs text-slate-500">Use the sidebar to navigate your school workspace</p>
      </div>

      <div className="flex items-center gap-4">
        {role === 'superadmin' && schools && schools.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="school-picker" className="text-xs text-slate-600">
              Active school
            </Label>
            <select
              id="school-picker"
              className="block min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={activeSchoolId ?? ''}
              onChange={(e) => onSchoolChange(e.target.value)}
            >
              <option value="">Select school…</option>
              {schools.map((s: { id: string; name: string }) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {role && (
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {ROLE_LABELS[role]}
          </span>
        )}

        <Link href="/profile" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <UserCircle aria-hidden />
          My profile
        </Link>

        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </div>
    </header>
  );
}
