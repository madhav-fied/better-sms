'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['school-users'],
    queryFn: () => apiClient.get('/users').then((r) => r.data?.data ?? []),
  });
  const users = data ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiClient.patch(`/users/${id}/status`, { is_active }).then((r) => r.data),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['school-users'] }); },
    onError: () => toast.error('Failed'),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}/sessions`).then((r) => r.data),
    onSuccess: () => toast.success('Sessions cleared'),
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : users.map((u: { id: string; name: string; phone: string; role: string; is_active: boolean }) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                    <td className="px-4 py-3 capitalize">{u.role}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.is_active ? 'default' : 'secondary'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => forceLogoutMutation.mutate(u.id)}>
                          Force Logout
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
