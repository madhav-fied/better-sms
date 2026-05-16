'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';

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
    onSuccess: () => { toast.success('Subject added'); setNewName(''); qc.invalidateQueries({ queryKey: ['subjects'] }); },
    onError: () => toast.error('Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/subjects/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['subjects'] }); },
    onError: () => toast.error('Cannot delete — subject may be in use'),
  });

  return (
    <div className="space-y-4 max-w-sm">
      <h1 className="text-xl font-semibold">Subjects</h1>
      <div className="flex gap-2">
        <Input placeholder="Subject name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button onClick={() => createMutation.mutate()} disabled={!newName || createMutation.isPending}>Add</Button>
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <div key={i} className="px-4 py-3"><Skeleton className="h-4" /></div>)
          : subjects.map((s: { id: string; name: string }) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 text-sm">
                <span>{s.name}</span>
                <button
                  onClick={() => deleteMutation.mutate(s.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
      </div>
    </div>
  );
}
