'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const { data, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => apiClient.get('/academic-years').then((r) => r.data?.data ?? []),
  });
  const items = data ?? [];

  const setActiveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/academic-years/${id}/set-active`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Active year updated');
      qc.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Academic years" description="Manage academic year periods and set the active year for your school." />

      <DataSection title="All academic years">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Label
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Start
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                End
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i} className="border-slate-200">
                      <TableCell colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : items.map((ay: { id: string; label: string; start_date: string; end_date: string; is_active: boolean }) => (
                  <TableRow key={ay.id} className="border-slate-200">
                    <TableCell className="px-6 py-4 font-medium text-slate-900">{ay.label}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{ay.start_date}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{ay.end_date}</TableCell>
                    <TableCell className="px-6 py-4">
                      {ay.is_active && (
                        <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {!ay.is_active && (
                        <Button size="sm" variant="outline" onClick={() => setActiveMutation.mutate(ay.id)}>
                          Set active
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && items.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={5}>
                  <EmptyState title="No academic years" description="Academic years will appear here once configured." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataSection>
    </div>
  );
}
