'use client';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { use } from 'react';

export default function NewsletterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['newsletter', id],
    queryFn: () => apiClient.get(`/communications/newsletters/${id}`).then((r) => r.data),
  });
  const n = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!n) return <p className="text-gray-400">Newsletter not found</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{n.title}</h1>
        <p className="text-sm text-gray-400 mt-1">{n.created_at?.split('T')[0]}</p>
      </div>
      <div className="rounded-lg border bg-white p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {n.content}
      </div>
    </div>
  );
}
