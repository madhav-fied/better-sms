'use client';

import { useQuery } from '@tanstack/react-query';
import { getStaff } from '@/lib/api/staff';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Staff } from '@/types/staff';
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

export default function StaffPage() {
  const { data, isLoading } = useQuery({ queryKey: ['staff'], queryFn: () => getStaff({ limit: 50 }) });
  const staff: Staff[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Browse staff members, view profiles, and add new employees to your school."
        actions={<ActionLink href="/staff/new">Add staff</ActionLink>}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Staff directory</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isLoading ? 'Loading staff…' : `${staff.length} member${staff.length === 1 ? '' : 's'} shown`}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Name
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Phone
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Role
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
                      <TableCell colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : staff.map((s) => (
                  <TableRow key={s.id} className="border-slate-200">
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/staff/${s.id}`}
                        className="font-medium text-slate-900 underline-offset-4 hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{s.phone ?? '—'}</TableCell>
                    <TableCell className="px-6 py-4 capitalize text-slate-700">{s.role}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant={s.is_active ? 'default' : 'secondary'}
                        className="rounded-md border border-slate-200 px-2.5 py-0.5"
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <ActionLink href={`/staff/${s.id}`}>View profile</ActionLink>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && staff.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={5}>
                  <EmptyState
                    title="No staff found"
                    description="Add your first staff member to get started."
                    action={<ActionLink href="/staff/new">Add staff</ActionLink>}
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
