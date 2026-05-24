'use client';

import { useQuery } from '@tanstack/react-query';
import { getNewsletter } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';

export default function NewsletterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['newsletter', id],
    queryFn: () => getNewsletter(id),
  });
  const n = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!n) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Newsletter not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={n.title}
        description={n.created_at?.split('T')[0]}
        actions={
          <ActionLink href="/communications/newsletters" variant="outline">
            Back to newsletters
          </ActionLink>
        }
      />
      <DataSection title="Newsletter content">
        <div className="whitespace-pre-wrap px-6 py-6 text-sm leading-relaxed text-slate-700">{n.content}</div>
      </DataSection>
    </div>
  );
}
