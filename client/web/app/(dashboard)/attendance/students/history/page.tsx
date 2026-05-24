'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudentAttendanceHistory } from '@/lib/api/attendance';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';
import EmptyState from '@/components/enterprise/EmptyState';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ClassSection {
  id: string;
  class_name: string;
  section: string;
}

export default function AttendanceHistoryPage() {
  const [classSectionId, setClassSectionId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: sections } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-history', classSectionId, month],
    queryFn: () => getStudentAttendanceHistory({ class_section_id: classSectionId, month }),
    enabled: !!classSectionId,
  });
  const records = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance history" description="Review student attendance records by class and month." />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <LabeledSelect
              label="Class section"
              value={classSectionId}
              onChange={(e) => setClassSectionId(e.target.value)}
              options={(sections ?? []).map((c: ClassSection) => ({
                value: c.id,
                label: `${c.class_name} ${c.section}`,
              }))}
              placeholder="Select class"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="month" className="text-slate-700">
              Month
            </Label>
            <input
              id="month"
              type="month"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </div>
      </section>

      {classSectionId && (
        <DataSection title="Records">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Student
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Date
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i} className="border-slate-200">
                        <TableCell colSpan={3} className="px-6 py-4">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                : records.map((r: { student_name: string; date: string; status: string }, i: number) => (
                    <TableRow key={i} className="border-slate-200">
                      <TableCell className="px-6 py-4 text-slate-900">{r.student_name}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{r.date}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          variant={r.status === 'present' ? 'default' : r.status === 'leave' ? 'secondary' : 'destructive'}
                          className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && records.length === 0 && (
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableCell colSpan={3}>
                    <EmptyState title="No records" description="No attendance records for this period." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataSection>
      )}
    </div>
  );
}
