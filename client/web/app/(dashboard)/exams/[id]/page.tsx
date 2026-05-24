'use client';

import { useQuery } from '@tanstack/react-query';
import { getExam, getExamSchedule } from '@/lib/api/exams';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['exam', id], queryFn: () => getExam(id) });
  const { data: scheduleData } = useQuery({ queryKey: ['exam-schedule', id], queryFn: () => getExamSchedule(id) });
  const e = data?.data;
  const schedule = scheduleData?.data ?? [];

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!e) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Exam not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={e.name}
        description="Exam details and subject schedule."
        actions={
          <>
            <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize">{e.status}</Badge>
            <ActionLink href={`/exams/${id}/schedule`}>Edit schedule</ActionLink>
            <ActionLink href="/exams" variant="outline">
              Back to exams
            </ActionLink>
          </>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-600">Type</dt>
            <dd className="mt-1 capitalize text-slate-900">{e.exam_type?.replace('_', ' ') ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Status</dt>
            <dd className="mt-1 capitalize text-slate-900">{e.status}</dd>
          </div>
        </dl>
      </section>

      {schedule.length > 0 && (
        <DataSection title="Schedule">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Subject
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Date
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Max marks
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Passing
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((s: { id: string; subject: string; exam_date?: string; max_marks: number; passing_marks: number }) => (
                <TableRow key={s.id} className="border-slate-200">
                  <TableCell className="px-6 py-4 font-medium text-slate-900">{s.subject}</TableCell>
                  <TableCell className="px-6 py-4 text-slate-600">{s.exam_date ?? '—'}</TableCell>
                  <TableCell className="px-6 py-4 text-slate-600">{s.max_marks}</TableCell>
                  <TableCell className="px-6 py-4 text-slate-600">{s.passing_marks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataSection>
      )}
    </div>
  );
}
