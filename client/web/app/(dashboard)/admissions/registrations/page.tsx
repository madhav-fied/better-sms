'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegistrations, updateRegistrationStatus } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { toast } from 'sonner';

const REG_STATUSES = ['pending', 'accepted', 'rejected'] as const;
type RegStatus = typeof REG_STATUSES[number];

const STATUS_STYLES: Record<RegStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function RegistrationsPage() {
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => getRegistrations({ limit: 100 }),
  });
  const items = data?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateRegistrationStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Status updated');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to update status');
    },
    onSettled: () => setUpdatingId(null),
  });

  const handleStatusChange = (id: string, status: string) => {
    setUpdatingId(id);
    statusMutation.mutate({ id, status });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admissions — Registrations</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Student Name</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((r: { id: string; student_fields?: { first_name?: string; last_name?: string }; submitted_at: string; status: string }) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admissions/registrations/${r.id}`} className="text-blue-600 hover:underline">
                        {[r.student_fields?.first_name, r.student_fields?.last_name].filter(Boolean).join(' ') || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.submitted_at?.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(evt) => handleStatusChange(r.id, evt.target.value)}
                        className={`text-xs font-medium rounded-full border px-2 py-0.5 cursor-pointer outline-none transition-opacity disabled:opacity-50 ${STATUS_STYLES[r.status as RegStatus] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}
                      >
                        {REG_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No registrations</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
