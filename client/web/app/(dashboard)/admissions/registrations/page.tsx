'use client';
import { useQuery } from '@tanstack/react-query';
import { getRegistrations } from '@/lib/api/admissions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function RegistrationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => getRegistrations({ limit: 30 }),
  });
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admissions — Registrations</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Student Name</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((r: { id: string; student_fields?: { first_name?: string; last_name?: string }; submitted_at: string; status: string }) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admissions/registrations/${r.id}`} className="text-blue-600 hover:underline">
                        {r.student_fields ? `${r.student_fields.first_name ?? ''} ${r.student_fields.last_name ?? ''}`.trim() : '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">—</td>
                    <td className="px-4 py-3 text-gray-500">{r.submitted_at?.split('T')[0]}</td>
                    <td className="px-4 py-3"><Badge>{r.status}</Badge></td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No registrations</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
