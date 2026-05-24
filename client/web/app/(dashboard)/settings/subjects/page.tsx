'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import EmptyState from '@/components/enterprise/EmptyState';

export default function SubjectsPage() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient.get('/subjects').then((r) => r.data?.data ?? []),
  });
  const subjects = data ?? [];

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/subjects', { name: newName }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Subject added');
      setNewName('');
      qc.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: () => toast.error('Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/subjects/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: () => toast.error('Cannot delete — subject may be in use'),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="Subjects" description="Manage the subject catalog used across classes and exams." />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="subject-name" className="text-slate-700">
            Subject name
          </Label>
          <div className="flex gap-2">
            <Input
              id="subject-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border-slate-200"
            />
            <Button onClick={() => createMutation.mutate()} disabled={!newName || createMutation.isPending}>
              Add
            </Button>
          </div>
        </div>
      </section>

      <DataSection title="All subjects">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
          </div>
        ) : subjects.length === 0 ? (
          <EmptyState title="No subjects" description="Add your first subject above." />
        ) : (
          <ul className="divide-y divide-slate-200">
            {subjects.map((s: { id: string; name: string }) => (
              <li key={s.id} className="flex items-center justify-between px-6 py-4 text-sm">
                <span className="font-medium text-slate-900">{s.name}</span>
                <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(s.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DataSection>
    </div>
  );
}
