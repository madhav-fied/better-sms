'use client';
import { useQuery } from '@tanstack/react-query';
import { getConcerns } from '@/lib/api/communications';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function ConcernsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['concerns'], queryFn: () => getConcerns({ limit: 30 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Concerns</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(4).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((c: { id: string; subject: string; created_at: string; status: string }) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/communications/concerns/${c.id}`} className="text-blue-600 hover:underline">{c.subject}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.created_at?.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.status === 'resolved' ? 'secondary' : 'default'}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No concerns</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
