'use client';

import { useQuery } from '@tanstack/react-query';
import { getHomework } from '@/lib/api/homework';
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

export default function HomeworkPage() {
  const { data, isLoading } = useQuery({ queryKey: ['homework'], queryFn: () => getHomework({ limit: 30 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework"
        description="View assigned homework, due dates, and subject details for each class."
        actions={<ActionLink href="/homework/new">Add homework</ActionLink>}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Assignments</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isLoading ? 'Loading homework…' : `${items.length} assignment${items.length === 1 ? '' : 's'} shown`}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Title
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Subject
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Due date
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
                      <TableCell colSpan={4} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : items.map((h: { id: string; title: string; subject: string; due_date: string }) => (
                  <TableRow key={h.id} className="border-slate-200">
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/homework/${h.id}`}
                        className="font-medium text-slate-900 underline-offset-4 hover:underline"
                      >
                        {h.title}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{h.subject}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{h.due_date}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <ActionLink href={`/homework/${h.id}`}>View</ActionLink>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && items.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={4}>
                  <EmptyState
                    title="No homework assigned"
                    description="Create a new assignment for your class."
                    action={<ActionLink href="/homework/new">Add homework</ActionLink>}
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
