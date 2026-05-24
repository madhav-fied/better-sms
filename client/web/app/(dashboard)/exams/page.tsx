'use client';

import { useQuery } from '@tanstack/react-query';
import { getExams } from '@/lib/api/exams';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
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

export default function ExamsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => getExams() });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description="Manage exam terms, schedules, and result entry for each assessment period."
        actions={<ActionLink href="/exams/new">New exam</ActionLink>}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Exam list</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isLoading ? 'Loading exams…' : `${items.length} exam${items.length === 1 ? '' : 's'} shown`}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Name
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
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i} className="border-slate-200">
                      <TableCell colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : items.map((e: { id: string; name: string; start_date?: string; end_date?: string; status: string }) => (
                  <TableRow key={e.id} className="border-slate-200">
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/exams/${e.id}`}
                        className="font-medium text-slate-900 underline-offset-4 hover:underline"
                      >
                        {e.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{e.start_date ?? '—'}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{e.end_date ?? '—'}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize">{e.status}</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <ActionLink href={`/exams/${e.id}`}>View</ActionLink>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && items.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={5}>
                  <EmptyState
                    title="No exams yet"
                    description="Create an exam to set up schedules and enter results."
                    action={<ActionLink href="/exams/new">New exam</ActionLink>}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
