'use client';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClassSectionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });
  const sections = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Class Sections</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Section</th>
              <th className="px-4 py-3 text-left">Class Teacher</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : sections.map((s: { id: string; class_name: string; section: string; class_teacher_name?: string }) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">{s.class_name}</td>
                    <td className="px-4 py-3">{s.section}</td>
                    <td className="px-4 py-3 text-gray-500">{s.class_teacher_name ?? '—'}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
