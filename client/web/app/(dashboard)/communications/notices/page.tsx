'use client';
import { useQuery } from '@tanstack/react-query';
import { getNotices } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function NoticesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['notices'], queryFn: () => getNotices({ limit: 30 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notices</h1>
        <Link href="/communications/notices/new" className="bg-gray-900 text-white text-sm px-3 py-2 rounded hover:bg-gray-700">
          + New Notice
        </Link>
      </div>
      <div className="space-y-2">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)
          : items.map((n: { id: string; title: string; created_at: string; target_roles: string[] }) => (
              <Link key={n.id} href={`/communications/notices/${n.id}`}>
                <div className="rounded-lg border bg-white p-4 hover:bg-gray-50 transition-colors">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.created_at?.split('T')[0]} · {n.target_roles?.join(', ')}</p>
                </div>
              </Link>
            ))}
        {!isLoading && items.length === 0 && (
          <p className="text-center text-gray-400 py-8">No notices</p>
        )}
      </div>
    </div>
  );
}
