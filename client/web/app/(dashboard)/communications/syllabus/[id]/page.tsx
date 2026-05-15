'use client';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { use } from 'react';

export default function SyllabusDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['syllabus', id],
    queryFn: () => apiClient.get(`/communications/syllabus/${id}`).then((r) => r.data),
  });
  const s = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!s) return <p className="text-gray-400">Syllabus not found</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{s.subject_name} — {s.class_name}</h1>
        <p className="text-sm text-gray-400 mt-1">{s.created_at?.split('T')[0]}</p>
      </div>
      <div className="rounded-lg border bg-white p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {s.content}
      </div>
    </div>
  );
}
