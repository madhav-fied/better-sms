'use client';
import { useQuery } from '@tanstack/react-query';
import { getSyllabus } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';

export default function SyllabusPage() {
  const { data, isLoading } = useQuery({ queryKey: ['syllabus'], queryFn: () => getSyllabus({ limit: 30 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Syllabus</h1>
      <div className="space-y-2">
        {isLoading
          ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)
          : items.map((s: { id: string; subject_name: string; class_name: string; content: string; created_at: string }) => (
              <div key={s.id} className="rounded-lg border bg-white p-4">
                <p className="font-medium text-sm">{s.subject_name} — {s.class_name}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.content}</p>
                <p className="text-xs text-gray-400 mt-1">{s.created_at?.split('T')[0]}</p>
              </div>
            ))}
        {!isLoading && items.length === 0 && (
          <p className="text-center text-gray-400 py-8">No syllabus entries</p>
        )}
      </div>
    </div>
  );
}
