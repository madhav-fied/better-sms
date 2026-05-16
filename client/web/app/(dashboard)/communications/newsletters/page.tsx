'use client';
import { useQuery } from '@tanstack/react-query';
import { getNewsletters } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewslettersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['newsletters'], queryFn: () => getNewsletters({ limit: 20 }) });
  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Newsletters</h1>
      <div className="space-y-2">
        {isLoading
          ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)
          : items.map((n: { id: string; title: string; content: string; created_at: string }) => (
              <div key={n.id} className="rounded-lg border bg-white p-4">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.content}</p>
                <p className="text-xs text-gray-400 mt-1">{n.created_at?.split('T')[0]}</p>
              </div>
            ))}
        {!isLoading && items.length === 0 && (
          <p className="text-center text-gray-400 py-8">No newsletters</p>
        )}
      </div>
    </div>
  );
}
