'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import EmptyState from '@/components/enterprise/EmptyState';
import { RegisterSchoolDialog } from '@/components/schools/RegisterSchoolDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SchoolsPage() {
  const qc = useQueryClient();
  const [registerOpen, setRegisterOpen] = useState(false);
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
    <div className="space-y-6">
      <RegisterSchoolDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <PageHeader
        title="Schools"
        description="Select a school to manage its data. Superadmin can switch between schools."
        actions={
          <Button onClick={() => setRegisterOpen(true)}>+ Register school</Button>
        }
      />

      <DataSection title="All schools">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Name
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Branch
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
                      <TableCell colSpan={4} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : schools.map((s: { id: string; name: string; branch_name?: string; is_active: boolean }) => (
                  <TableRow key={s.id} className="border-slate-200">
                    <TableCell className="px-6 py-4 font-medium text-slate-900">{s.name}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{s.branch_name ?? '—'}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant={s.is_active ? 'default' : 'secondary'}
                        className="rounded-md border border-slate-200 px-2.5 py-0.5"
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant={activeId === s.id ? 'default' : 'outline'}
                        onClick={() => selectSchool(s.id)}
                      >
                        {activeId === s.id ? 'Selected' : 'Select school'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && schools.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={4}>
                  <EmptyState title="No schools" description="No schools are registered in the system." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataSection>
    </div>
  );
}
