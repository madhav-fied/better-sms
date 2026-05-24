'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useActiveAY } from '@/hooks/useActiveAY';
import { useAuthStore } from '@/store/auth';

export default function ClassSectionsPage() {
  const qc = useQueryClient();
  const { data: activeAy } = useActiveAY();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [form, setForm] = useState({ class_name: '', section: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });
  const sections = data ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      if (!activeAy?.id || !schoolId) throw new Error('Missing school or academic year');
      return apiClient.post('/class-sections', {
        school_id: schoolId,
        academic_year_id: activeAy.id,
        class_name: form.class_name,
        section: form.section,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success('Class section created');
      setForm({ class_name: '', section: '' });
      qc.invalidateQueries({ queryKey: ['class-sections'] });
    },
    onError: () => toast.error('Failed — ensure active academic year is set'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Class Sections</h1>

      <div className="rounded-lg border bg-white p-4 space-y-3 max-w-md">
        <h2 className="text-sm font-medium">Add class section</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Class</Label>
            <Input value={form.class_name} onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))} placeholder="Grade 1" />
          </div>
          <div className="space-y-1">
            <Label>Section</Label>
            <Input value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} placeholder="A" />
          </div>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.class_name || !form.section}>
          Add
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Section</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={2} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : sections.map((s: { id: string; class_name: string; section: string }) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">{s.class_name}</td>
                    <td className="px-4 py-3">{s.section}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
