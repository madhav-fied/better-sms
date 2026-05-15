'use client';
import { useQuery } from '@tanstack/react-query';
import { getEnquiries } from '@/lib/api/admissions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useState } from 'react';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'default', contacted: 'secondary', visited: 'outline', rejected: 'destructive',
};

export default function EnquiriesPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', status],
    queryFn: () => getEnquiries({ status: status || undefined, limit: 30 }),
  });
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admissions — Enquiries</h1>
      <select
        className="border rounded px-3 py-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="visited">Visited</option>
        <option value="rejected">Rejected</option>
      </select>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((e: { id: string; name: string; phone: string; class_interested: string; created_at: string; status: string }) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admissions/enquiries/${e.id}`} className="text-blue-600 hover:underline">{e.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.phone}</td>
                    <td className="px-4 py-3">{e.class_interested}</td>
                    <td className="px-4 py-3 text-gray-500">{e.created_at?.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[e.status] ?? 'secondary'}>{e.status}</Badge>
                    </td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No enquiries</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
