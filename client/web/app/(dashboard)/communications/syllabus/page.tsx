'use client';

import { useQuery } from '@tanstack/react-query';
import { getSyllabus } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/enterprise/EmptyState';
import ActionLink from '@/components/enterprise/ActionLink';

export default function SyllabusPage() {
  const { data, isLoading } = useQuery({ queryKey: ['syllabus'], queryFn: () => getSyllabus({ limit: 30 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Syllabus"
        description="Browse and manage syllabus documents by subject and class."
        actions={<ActionLink href="/communications/syllabus/new">Add syllabus</ActionLink>}
      />

      <div className="space-y-3">
        {isLoading
          ? Array(3)
              .fill(0)
              .map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : items.map((s: { id: string; subject_name: string; class_name: string; content: string; created_at: string }) => (
              <Link
                key={s.id}
                href={`/communications/syllabus/${s.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300"
              >
                <p className="font-semibold text-slate-900">
                  {s.subject_name} — {s.class_name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{s.content}</p>
                <p className="mt-2 text-xs text-slate-400">{s.created_at?.split('T')[0]}</p>
              </Link>
            ))}
        {!isLoading && items.length === 0 && (
          <EmptyState title="No syllabus entries" description="Syllabus documents will appear here when published." />
        )}
      </div>
    </div>
  );
}
