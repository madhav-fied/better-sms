'use client';
import { useQuery } from '@tanstack/react-query';
import { getEnquiries } from '@/lib/api/admissions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ENQUIRY_STATUS_LABEL } from '@/lib/mappers';
import { useState } from 'react';
import Link from 'next/link';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admissions — Enquiries</h1>
        <a href="/admissions/enquiries/new" className="bg-gray-900 text-white text-sm px-3 py-2 rounded hover:bg-gray-700">
          + New Enquiry
        </a>
      </div>
      <select
        className="border rounded px-3 py-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="open">Open</option>
        <option value="converted">Converted</option>
        <option value="rejected">Rejected</option>
      </select>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Parent</th>
              <th className="px-4 py-3 text-left">Mobile</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((e: {
                  id: string;
                  student_name: string;
                  parent_name: string;
                  mobile: string;
                  date: string;
                  status: string;
                }) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admissions/enquiries/${e.id}`} className="text-blue-600 hover:underline">{e.student_name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.parent_name}</td>
                    <td className="px-4 py-3 text-gray-500">{e.mobile}</td>
                    <td className="px-4 py-3 text-gray-500">{e.date}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[e.status] ?? 'secondary'}>
                        {ENQUIRY_STATUS_LABEL[e.status] ?? e.status}
                      </Badge>
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
