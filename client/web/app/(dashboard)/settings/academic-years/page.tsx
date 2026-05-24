'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import EmptyState from '@/components/enterprise/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AcademicYearsPage() {
  const qc = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [form, setForm] = useState({ label: '', start_date: '', end_date: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => apiClient.get('/academic-years').then((r) => r.data?.data ?? []),
  });
  const items = data ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      if (!schoolId) throw new Error('No school');
      return apiClient.post('/academic-years', { school_id: schoolId, ...form }).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success('Academic year created');
      setForm({ label: '', start_date: '', end_date: '' });
      qc.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: () => toast.error('Failed to create academic year'),
  });

  const setActiveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/academic-years/${id}/set-active`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Active year updated');
      qc.invalidateQueries({ queryKey: ['academic-years'] });
      qc.invalidateQueries({ queryKey: ['active-ay'] });
    },
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Academic years" description="Create academic year periods and set which year is active for your school." />

      <DataSection title="Add academic year">
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ay-label" className="text-slate-700">Year label</Label>
            <Input id="ay-label" placeholder="2025–26" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className="border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ay-start" className="text-slate-700">Start date</Label>
            <Input id="ay-start" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ay-end" className="text-slate-700">End date</Label>
            <Input id="ay-end" type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="border-slate-200" />
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-4">
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.label || !form.start_date || !form.end_date}>
            Add academic year
          </Button>
        </div>
      </DataSection>

      <DataSection title="All academic years">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Label</TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Start</TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">End</TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Status</TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array(3).fill(0).map((_, i) => (
                  <TableRow key={i} className="border-slate-200"><TableCell colSpan={5} className="px-6 py-4"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ))
              : items.map((ay: { id: string; label: string; start_date: string; end_date: string; is_active: boolean }) => (
                  <TableRow key={ay.id} className="border-slate-200">
                    <TableCell className="px-6 py-4 font-medium text-slate-900">{ay.label}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{ay.start_date}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{ay.end_date}</TableCell>
                    <TableCell className="px-6 py-4">
                      {ay.is_active && <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5">Active</Badge>}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {!ay.is_active && (
                        <Button size="sm" variant="outline" onClick={() => setActiveMutation.mutate(ay.id)}>Set active</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && items.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={5}><EmptyState title="No academic years" description="Add your first academic year above." /></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataSection>
    </div>
  );
}
