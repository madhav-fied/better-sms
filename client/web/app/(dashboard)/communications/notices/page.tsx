'use client';

import { useQuery } from '@tanstack/react-query';
import { getNotices } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import EmptyState from '@/components/enterprise/EmptyState';
import { useRole } from '@/hooks/useRole';

export default function NoticesPage() {
  const { is } = useRole();
  const canCreate = is('admin', 'superadmin', 'teacher');
  const { data, isLoading } = useQuery({ queryKey: ['notices'], queryFn: () => getNotices({ limit: 30 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices"
        description="School announcements and updates for staff, students, and parents."
        actions={canCreate ? <ActionLink href="/communications/notices/new">New notice</ActionLink> : undefined}
      />

      <div className="space-y-3">
        {isLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : items.map((n: { id: string; title: string; created_at: string; target_roles?: string[] }) => (
              <Link
                key={n.id}
                href={`/communications/notices/${n.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300"
              >
                <p className="font-semibold text-slate-900">{n.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {n.created_at?.split('T')[0]}
                  {n.target_roles?.length ? ` · ${n.target_roles.join(', ')}` : ''}
                </p>
              </Link>
            ))}
        {!isLoading && items.length === 0 && (
          <EmptyState
            title="No notices"
            description="Notices will appear here when published."
            action={canCreate ? <ActionLink href="/communications/notices/new">New notice</ActionLink> : undefined}
          />
        )}
      </div>
    </div>
  );
}
