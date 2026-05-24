'use client';

import { useQuery } from '@tanstack/react-query';
import { getRegistrations } from '@/lib/api/admissions';
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

export default function RegistrationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => getRegistrations({ limit: 30 }),
  });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Admissions — Registrations" description="Review submitted registrations and admit students to classes." />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Student name
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Submitted
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
              ? Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i} className="border-slate-200">
                      <TableCell colSpan={4} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : items.map(
                  (r: {
                    id: string;
                    student_fields?: { first_name?: string; last_name?: string };
                    submitted_at: string;
                    status: string;
                  }) => (
                    <TableRow key={r.id} className="border-slate-200">
                      <TableCell className="px-6 py-4">
                        <Link
                          href={`/admissions/registrations/${r.id}`}
                          className="font-medium text-slate-900 underline-offset-4 hover:underline"
                        >
                          {r.student_fields
                            ? `${r.student_fields.first_name ?? ''} ${r.student_fields.last_name ?? ''}`.trim()
                            : '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{r.submitted_at?.split('T')[0]}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <ActionLink href={`/admissions/registrations/${r.id}`}>View</ActionLink>
                      </TableCell>
                    </TableRow>
                  ),
                )}
            {!isLoading && items.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={4}>
                  <EmptyState title="No registrations" description="Registrations converted from enquiries will appear here." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
