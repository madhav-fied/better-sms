'use client';

import { useQuery } from '@tanstack/react-query';
import { getSyllabusItem } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';

export default function SyllabusDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['syllabus', id],
    queryFn: () => getSyllabusItem(id),
  });
  const s = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!s) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Syllabus not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={`${s.subject_name} — ${s.class_name}`}
        description={s.created_at?.split('T')[0]}
        actions={
          <ActionLink href="/communications/syllabus" variant="outline">
            Back to syllabus
          </ActionLink>
        }
      />
      <DataSection title="Syllabus content">
        <div className="whitespace-pre-wrap px-6 py-6 text-sm leading-relaxed text-slate-700">{s.content}</div>
      </DataSection>
    </div>
  );
}
