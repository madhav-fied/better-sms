'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaves, applyLeave, approveLeave, rejectLeave } from '@/lib/api/leaves';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';
import EmptyState from '@/components/enterprise/EmptyState';
import { useRole } from '@/hooks/useRole';
import { useAuthStore } from '@/store/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function daysBetween(from: string, to: string) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export default function LeavesPage() {
  const qc = useQueryClient();
  const { is, role } = useRole();
  const entityId = useAuthStore((s) => s.entityId);
  const isAdmin = is('admin', 'superadmin');
  const canApply = !isAdmin && !!entityId;

  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [applyForm, setApplyForm] = useState({
    leave_type: 'casual',
    from_date: '',
    to_date: '',
    reason: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', tab],
    queryFn: () => getLeaves({ status: tab === 'pending' ? 'pending' : undefined, limit: 30 }),
  });
  const items = data?.data ?? [];

  const applyMutation = useMutation({
    mutationFn: () => {
      const entityType = role === 'student' ? 'student' : 'staff';
      return applyLeave({
        entity_type: entityType,
        entity_id: entityId,
        leave_type: applyForm.leave_type,
        from_date: applyForm.from_date,
        to_date: applyForm.to_date,
        days: daysBetween(applyForm.from_date, applyForm.to_date),
        reason: applyForm.reason || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Leave application submitted');
      setApplyForm({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: () => toast.error('Failed to submit leave'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLeave(id),
    onSuccess: () => {
      toast.success('Approved');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: () => toast.error('Failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectLeave(id),
    onSuccess: () => {
      toast.success('Rejected');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaves"
        description={isAdmin ? 'Review and approve leave requests from staff and students.' : 'Apply for leave and track your requests.'}
      />

      {canApply && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Apply for leave</h2>
          <p className="mt-1 text-sm text-slate-600">Submit a new leave request for approval.</p>
          <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
            <LabeledSelect
              label="Leave type"
              value={applyForm.leave_type}
              onChange={(e) => setApplyForm((f) => ({ ...f, leave_type: e.target.value }))}
              options={[
                { value: 'sick', label: 'Sick' },
                { value: 'casual', label: 'Casual' },
                { value: 'earned', label: 'Earned' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <div className="space-y-1.5">
              <Label htmlFor="from-date" className="text-slate-700">
                From date
              </Label>
              <Input
                id="from-date"
                type="date"
                value={applyForm.from_date}
                onChange={(e) => setApplyForm((f) => ({ ...f, from_date: e.target.value }))}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to-date" className="text-slate-700">
                To date
              </Label>
              <Input
                id="to-date"
                type="date"
                value={applyForm.to_date}
                onChange={(e) => setApplyForm((f) => ({ ...f, to_date: e.target.value }))}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reason" className="text-slate-700">
                Reason
              </Label>
              <Input
                id="reason"
                value={applyForm.reason}
                onChange={(e) => setApplyForm((f) => ({ ...f, reason: e.target.value }))}
                className="border-slate-200"
              />
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending || !applyForm.from_date || !applyForm.to_date}
          >
            Submit application
          </Button>
        </section>
      )}

      {isAdmin && (
        <div className="flex gap-2">
          {(['pending', 'all'] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? 'default' : 'outline'}
              onClick={() => setTab(t)}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
        </div>
      )}

      <DataSection title={isAdmin ? 'Leave requests' : 'My leave history'}>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Name
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Type
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                From
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                To
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </TableHead>
              {isAdmin && (
                <TableHead className="bg-slate-50 px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i} className="border-slate-200">
                      <TableCell colSpan={isAdmin ? 6 : 5} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : items.map(
                  (l: {
                    id: string;
                    applicant_name?: string;
                    leave_type: string;
                    from_date: string;
                    to_date: string;
                    status: string;
                  }) => (
                    <TableRow key={l.id} className="border-slate-200">
                      <TableCell className="px-6 py-4 text-slate-900">{l.applicant_name ?? '—'}</TableCell>
                      <TableCell className="px-6 py-4 capitalize text-slate-600">{l.leave_type}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{l.from_date}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{l.to_date}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize">{l.status}</Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="px-6 py-4 text-right">
                          {l.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(l.id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(l.id)}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ),
                )}
            {!isLoading && items.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={isAdmin ? 6 : 5}>
                  <EmptyState title="No leaves" description="No leave records to display." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataSection>
    </div>
  );
}
