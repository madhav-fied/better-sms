'use client';
import { useQuery } from '@tanstack/react-query';
import { getStaffMember } from '@/lib/api/staff';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { use } from 'react';

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['staff', id], queryFn: () => getStaffMember(id) });
  const s = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!s) return <p className="text-gray-400">Staff member not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{s.name}</h1>
        <div className="flex gap-2">
          <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
          <Link href={`/staff/${id}/edit`} className="text-sm text-blue-600 hover:underline">Edit</Link>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        <div className="flex gap-4"><span className="w-24 text-gray-400">Phone</span><span>{s.phone}</span></div>
        <div className="flex gap-4"><span className="w-24 text-gray-400">Role</span><span className="capitalize">{s.role}</span></div>
        {s.subjects?.length > 0 && (
          <div className="flex gap-4"><span className="w-24 text-gray-400">Subjects</span><span>{s.subjects.join(', ')}</span></div>
        )}
      </div>
    </div>
  );
}
