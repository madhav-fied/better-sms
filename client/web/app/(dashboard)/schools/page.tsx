'use client';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function SchoolsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: () => apiClient.get('/schools').then((r) => r.data?.data ?? []),
  });
  const schools = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Schools</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : schools.map((s: { id: string; name: string; code: string; is_active: boolean }) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/schools/${s.id}`} className="text-blue-600 hover:underline">{s.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.code}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
