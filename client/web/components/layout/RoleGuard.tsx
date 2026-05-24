'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { canAccessRoute, getDefaultRoute } from '@/constants/route-access';
import { toast } from 'sonner';

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useRole();

  useEffect(() => {
    if (!role) return;
    if (!canAccessRoute(role, pathname)) {
      toast.error('You do not have access to this page.');
      router.replace(getDefaultRoute(role));
    }
  }, [role, pathname, router]);

  return <>{children}</>;
}
