'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';

export default function SchoolsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: () => apiClient.get('/schools').then((r) => r.data?.data ?? []),
  });
  const schools = data ?? [];
  const activeId = storage.getActiveSchoolId();

  const selectSchool = (id: string) => {
    storage.setActiveSchoolId(id);
    toast.success('School selected — you can open Dashboard and other modules');
    qc.invalidateQueries();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Schools</h1>
      <p className="text-sm text-gray-500">Select a school to manage its data (superadmin).</p>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : schools.map((s: { id: string; name: string; branch_name?: string; is_active: boolean }) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.branch_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={activeId === s.id ? 'default' : 'outline'}
                        onClick={() => selectSchool(s.id)}
                      >
                        {activeId === s.id ? 'Selected' : 'Select'}
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
