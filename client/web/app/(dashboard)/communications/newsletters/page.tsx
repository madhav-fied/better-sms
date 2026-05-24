'use client';

import { useQuery } from '@tanstack/react-query';
import { getNewsletters } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/enterprise/EmptyState';
import ActionLink from '@/components/enterprise/ActionLink';

export default function NewslettersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['newsletters'], queryFn: () => getNewsletters({ limit: 20 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletters"
        description="Read and publish school newsletters."
        actions={<ActionLink href="/communications/newsletters/new">Add newsletter</ActionLink>}
      />

      <div className="space-y-3">
        {isLoading
          ? Array(3)
              .fill(0)
              .map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : items.map((n: { id: string; title: string; content: string; created_at: string }) => (
              <Link
                key={n.id}
                href={`/communications/newsletters/${n.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300"
              >
                <p className="font-semibold text-slate-900">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{n.content}</p>
                <p className="mt-2 text-xs text-slate-400">{n.created_at?.split('T')[0]}</p>
              </Link>
            ))}
        {!isLoading && items.length === 0 && (
          <EmptyState title="No newsletters" description="Newsletters will appear here when published." />
        )}
      </div>
    </div>
  );
}
