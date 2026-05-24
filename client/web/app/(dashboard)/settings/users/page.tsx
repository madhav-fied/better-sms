'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';
import EmptyState from '@/components/enterprise/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function UsersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ phone: '', email: '', password: 'Welcome1', role: 'parent' });

  const { data, isLoading } = useQuery({
    queryKey: ['school-users'],
    queryFn: () => apiClient.get('/users').then((r) => r.data?.data ?? []),
  });
  const users = data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient
        .post('/users', {
          phone: form.phone,
          email: form.email || undefined,
          password: form.password,
          role: form.role,
        })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success('User created');
      setForm({ phone: '', email: '', password: 'Welcome1', role: 'parent' });
      qc.invalidateQueries({ queryKey: ['school-users'] });
    },
    onError: () => toast.error('Failed to create user'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiClient.patch(`/users/${id}/status`, { is_active }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['school-users'] });
    },
    onError: () => toast.error('Failed'),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}/sessions`).then((r) => r.data),
    onSuccess: () => toast.success('Sessions cleared'),
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Create login accounts and manage user access for your school." />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Add user</h2>
        <div className="mt-4 grid max-w-md gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-slate-700">
              Phone
            </Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700">
              Email
            </Label>
            <Input id="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <LabeledSelect
            label="Role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'parent', label: 'Parent' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'staff', label: 'Staff' },
              { value: 'admin', label: 'Admin' },
            ]}
            placeholder="Select role"
          />
          <Button size="sm" className="w-fit" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.phone}>
            Create user
          </Button>
        </div>
      </section>

      <DataSection title="All users">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Email / Phone
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Phone
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Role
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i} className="border-slate-200">
                      <TableCell colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : users.map((u: { id: string; email?: string; phone: string; role: string; is_active: boolean }) => (
                  <TableRow key={u.id} className="border-slate-200">
                    <TableCell className="px-6 py-4 text-slate-900">{u.email ?? u.phone}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{u.phone}</TableCell>
                    <TableCell className="px-6 py-4 capitalize text-slate-700">{u.role}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant={u.is_active ? 'default' : 'secondary'}
                        className="rounded-md border border-slate-200 px-2.5 py-0.5"
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => forceLogoutMutation.mutate(u.id)}>
                          Force logout
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && users.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={5}>
                  <EmptyState title="No users" description="Create a user account above." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataSection>
    </div>
  );
}
