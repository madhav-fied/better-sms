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
          userId: d.id,
          entityId: d.entity_id,
          expiresAt: d.expires_at,
        });
        setChecking(false);
      })
      .catch(() => {
        clearSession();
        router.replace('/login');
      });
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        Loading...
      </div>
    );
  }
  return <>{children}</>;
}
