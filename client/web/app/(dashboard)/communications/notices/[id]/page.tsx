'use client';
import { useQuery } from '@tanstack/react-query';
import { getNotice } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import { use } from 'react';

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['notice', id], queryFn: () => getNotice(id) });
  const n = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!n) return <p className="text-gray-400">Notice not found</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{n.title}</h1>
        <p className="text-sm text-gray-400 mt-1">{n.created_at?.split('T')[0]} · {n.target_roles?.join(', ')}</p>
      </div>
      <div className="rounded-lg border bg-white p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {n.content}
      </div>
    </div>
  );
}
