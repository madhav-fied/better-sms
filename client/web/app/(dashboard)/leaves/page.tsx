'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaves, approveLeave, rejectLeave } from '@/lib/api/leaves';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';

export default function LeavesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const { data, isLoading } = useQuery({
    queryKey: ['leaves', tab],
    queryFn: () => getLeaves({ status: tab === 'pending' ? 'pending' : undefined, limit: 30 }),
  });
  const items = data?.data ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLeave(id),
    onSuccess: () => { toast.success('Approved'); qc.invalidateQueries({ queryKey: ['leaves'] }); },
    onError: () => toast.error('Failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectLeave(id, 'Rejected by admin'),
    onSuccess: () => { toast.success('Rejected'); qc.invalidateQueries({ queryKey: ['leaves'] }); },
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Leaves</h1>
      <div className="flex gap-2">
        {(['pending', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm capitalize ${tab === t ? 'bg-gray-900 text-white' : 'border hover:bg-gray-50'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">From</th>
              <th className="px-4 py-3 text-left">To</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(4).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((l: { id: string; applicant_name: string; leave_type: string; start_date: string; end_date: string; status: string }) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">{l.applicant_name}</td>
                    <td className="px-4 py-3 capitalize">{l.leave_type}</td>
                    <td className="px-4 py-3 text-gray-500">{l.start_date}</td>
                    <td className="px-4 py-3 text-gray-500">{l.end_date}</td>
                    <td className="px-4 py-3"><Badge>{l.status}</Badge></td>
                    <td className="px-4 py-3">
                      {l.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(l.id)}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(l.id)}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No leaves</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
