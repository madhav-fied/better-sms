'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEnquiries } from '@/lib/api/admissions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ENQUIRY_STATUS_LABEL } from '@/lib/mappers';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';
import EmptyState from '@/components/enterprise/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default',
  converted: 'secondary',
  rejected: 'destructive',
};

export default function EnquiriesPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', status],
    queryFn: () => getEnquiries({ status: status || undefined, limit: 30 }),
  });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions — Enquiries"
        description="Track admission enquiries from first contact through conversion."
        actions={<ActionLink href="/admissions/enquiries/new">New enquiry</ActionLink>}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <LabeledSelect
          label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'converted', label: 'Converted' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          placeholder="All statuses"
          className="max-w-xs"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Student
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Parent
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Mobile
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date
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
                      <TableCell colSpan={6} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : items.map(
                  (e: {
                    id: string;
                    student_name: string;
                    parent_name: string;
                    mobile: string;
                    date: string;
                    status: string;
                  }) => (
                    <TableRow key={e.id} className="border-slate-200">
                      <TableCell className="px-6 py-4">
                        <Link
                          href={`/admissions/enquiries/${e.id}`}
                          className="font-medium text-slate-900 underline-offset-4 hover:underline"
                        >
                          {e.student_name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{e.parent_name}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{e.mobile}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{e.date}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant={STATUS_COLORS[e.status] ?? 'secondary'} className="rounded-md border border-slate-200 px-2.5 py-0.5">
                          {ENQUIRY_STATUS_LABEL[e.status] ?? e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <ActionLink href={`/admissions/enquiries/${e.id}`}>View</ActionLink>
                      </TableCell>
                    </TableRow>
                  ),
                )}
            {!isLoading && items.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={6}>
                  <EmptyState
                    title="No enquiries"
                    description="Create a new enquiry to start the admissions process."
                    action={<ActionLink href="/admissions/enquiries/new">New enquiry</ActionLink>}
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
