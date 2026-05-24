'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { getMe } from '@/lib/api/auth';
import { storage } from '@/lib/storage';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const { setSession, clearSession } = useAuthStore();

  useEffect(() => {
    const token = storage.getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getMe()
      .then((res) => {
        const d = res.data;
        setSession({
          token,
          role: d.role,
          schoolId: d.school_id,
          userId: d.user_id,
          entityId: d.entity_id,
          expiresAt: d.expires_at ?? null,
        });
        if (d.school_id) storage.setActiveSchoolId(d.school_id);
        setChecking(false);
      })
      .catch(() => {
        clearSession();
        storage.clearActiveSchoolId();
        router.replace('/login');
      });
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-sm text-center">
          <p className="text-sm font-medium text-slate-900">Loading your workspace…</p>
          <p className="mt-1 text-xs text-slate-500">Please wait a moment</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
