'use client';
import { useQuery } from '@tanstack/react-query';
import { getExams } from '@/lib/api/exams';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function ExamsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => getExams() });
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Exams</h1>
        <Link href="/exams/new" className="bg-gray-900 text-white text-sm px-3 py-2 rounded hover:bg-gray-700">
          + New Exam
        </Link>
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Start</th>
              <th className="px-4 py-3 text-left">End</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(4).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((e: { id: string; name: string; start_date: string; end_date: string; status: string }) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/exams/${e.id}`} className="text-blue-600 hover:underline">{e.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.start_date}</td>
                    <td className="px-4 py-3 text-gray-500">{e.end_date}</td>
                    <td className="px-4 py-3"><Badge>{e.status}</Badge></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
