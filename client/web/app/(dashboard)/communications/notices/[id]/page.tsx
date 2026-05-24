'use client';

import { useQuery } from '@tanstack/react-query';
import { getNotice } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['notice', id], queryFn: () => getNotice(id) });
  const n = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!n) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Notice not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={n.title}
        description={`${n.created_at?.split('T')[0] ?? ''}${n.target_roles?.length ? ` · ${n.target_roles.join(', ')}` : ''}`}
        actions={
          <ActionLink href="/communications/notices" variant="outline">
            Back to notices
          </ActionLink>
        }
      />
      <DataSection title="Notice content">
        <div className="whitespace-pre-wrap px-6 py-6 text-sm leading-relaxed text-slate-700">{n.content ?? n.body}</div>
      </DataSection>
    </div>
  );
}
