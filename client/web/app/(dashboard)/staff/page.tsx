'use client';
import { useQuery } from '@tanstack/react-query';
import { getStaff } from '@/lib/api/staff';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Staff } from '@/types/staff';

export default function StaffPage() {
  const { data, isLoading } = useQuery({ queryKey: ['staff'], queryFn: () => getStaff({ limit: 50 }) });
  const staff: Staff[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Staff</h1>
        <Link href="/staff/new" className="bg-gray-900 text-white text-sm px-3 py-2 rounded hover:bg-gray-700">
          + Add Staff
        </Link>
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span>{s.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.phone}</td>
                    <td className="px-4 py-3 capitalize">{s.role}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
            {!isLoading && staff.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No staff found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
