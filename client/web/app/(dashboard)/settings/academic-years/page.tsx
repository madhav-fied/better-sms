'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AcademicYearsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => apiClient.get('/academic-years').then((r) => r.data?.data ?? []),
  });
  const items = data ?? [];

  const setActiveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/academic-years/${id}/set-active`).then((r) => r.data),
    onSuccess: () => { toast.success('Active year updated'); qc.invalidateQueries({ queryKey: ['academic-years'] }); },
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Academic Years</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Label</th>
              <th className="px-4 py-3 text-left">Start</th>
              <th className="px-4 py-3 text-left">End</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((ay: { id: string; label: string; start_date: string; end_date: string; is_active: boolean }) => (
                  <tr key={ay.id}>
                    <td className="px-4 py-3 font-medium">{ay.label}</td>
                    <td className="px-4 py-3 text-gray-500">{ay.start_date}</td>
                    <td className="px-4 py-3 text-gray-500">{ay.end_date}</td>
                    <td className="px-4 py-3">
                      {ay.is_active && <Badge>Active</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {!ay.is_active && (
                        <Button size="sm" variant="outline" onClick={() => setActiveMutation.mutate(ay.id)}>
                          Set Active
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
