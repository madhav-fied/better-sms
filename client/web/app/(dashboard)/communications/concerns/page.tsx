'use client';

import { useQuery } from '@tanstack/react-query';
import { getConcerns } from '@/lib/api/communications';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import EmptyState from '@/components/enterprise/EmptyState';
import { useRole } from '@/hooks/useRole';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ConcernsPage() {
  const { is } = useRole();
  const isParent = is('parent');
  const { data, isLoading } = useQuery({ queryKey: ['concerns'], queryFn: () => getConcerns({ limit: 30 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concerns"
        description="Track submitted concerns and follow up on responses."
        actions={isParent ? <ActionLink href="/communications/concerns/new">Raise concern</ActionLink> : undefined}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                      <TableCell colSpan={4} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : items.map((c: { id: string; subject: string; created_at: string; status: string }) => (
                  <TableRow key={c.id} className="border-slate-200">
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/communications/concerns/${c.id}`}
                        className="font-medium text-slate-900 underline-offset-4 hover:underline"
                      >
                        {c.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{c.created_at?.split('T')[0]}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant={c.status === 'resolved' ? 'secondary' : 'default'}
                        className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize"
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <ActionLink href={`/communications/concerns/${c.id}`}>View</ActionLink>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && items.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={4}>
                  <EmptyState
                    title="No concerns"
                    description="Concerns you submit will appear here."
                    action={isParent ? <ActionLink href="/communications/concerns/new">Raise concern</ActionLink> : undefined}
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
