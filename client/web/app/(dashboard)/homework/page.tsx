'use client';
import { useQuery } from '@tanstack/react-query';
import { getHomework } from '@/lib/api/homework';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function HomeworkPage() {
  const { data, isLoading } = useQuery({ queryKey: ['homework'], queryFn: () => getHomework({ limit: 30 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Homework</h1>
        <Link href="/homework/new" className="bg-gray-900 text-white text-sm px-3 py-2 rounded hover:bg-gray-700">
          + New
        </Link>
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(4).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((h: { id: string; title: string; subject: string; due_date: string }) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/homework/${h.id}`} className="text-blue-600 hover:underline">{h.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{h.subject}</td>
                    <td className="px-4 py-3 text-gray-500">{h.due_date}</td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No homework assigned</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
