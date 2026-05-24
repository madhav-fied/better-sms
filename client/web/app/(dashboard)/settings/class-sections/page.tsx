'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { useActiveAY } from '@/hooks/useActiveAY';
import { useAuthStore } from '@/store/auth';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import ActionLink from '@/components/enterprise/ActionLink';
import EmptyState from '@/components/enterprise/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
      return apiClient
        .post('/class-sections', {
          school_id: schoolId,
          academic_year_id: activeAy.id,
          class_name: form.class_name,
          section: form.section,
        })
        .then((r) => r.data);
    },
    onSuccess: () => {
      toast.success('Class section created');
      setForm({ class_name: '', section: '' });
      qc.invalidateQueries({ queryKey: ['class-sections'] });
    },
    onError: () => toast.error('Failed — ensure active academic year is set'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class sections"
        description="Define class and section combinations for the active academic year."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Add class section</h2>
        <p className="mt-1 text-sm text-slate-600">Create a new class-section for {activeAy?.label ?? 'the active year'}.</p>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="class-name" className="text-slate-700">
              Class
            </Label>
            <Input
              id="class-name"
              value={form.class_name}
              onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section-name" className="text-slate-700">
              Section
            </Label>
            <Input
              id="section-name"
              value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
              className="border-slate-200"
            />
          </div>
        </div>
        <Button
          className="mt-4"
          size="sm"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !form.class_name || !form.section}
        >
          Add class section
        </Button>
      </section>

      <DataSection title="All class sections" description="Open a class to manage roster and subject assignments.">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
          </div>
        ) : sections.length === 0 ? (
          <EmptyState title="No class sections" description="Add your first class section above." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Class
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Section
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s: { id: string; class_name: string; section: string }) => (
                <TableRow key={s.id} className="border-slate-200">
                  <TableCell className="px-6 py-4">
                    <Link
                      href={`/settings/class-sections/${s.id}`}
                      className="font-medium text-slate-900 underline-offset-4 hover:underline"
                    >
                      {s.class_name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-slate-600">{s.section}</TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <ActionLink href={`/settings/class-sections/${s.id}`}>View</ActionLink>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataSection>
    </div>
  );
}
