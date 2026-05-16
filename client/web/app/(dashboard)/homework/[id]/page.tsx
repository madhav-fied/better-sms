'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHomeworkById, updateHomework } from '@/lib/api/homework';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import { use } from 'react';

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="w-32 text-muted-foreground shrink-0 text-xs pt-0.5">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['homework', id], queryFn: () => getHomeworkById(id) });
  const hw = data?.data;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', description: '', due_date: '', assigned_date: '' });

  const openEdit = () => {
    if (hw) {
      setForm({
        title: hw.title ?? '',
        subject: hw.subject ?? '',
        description: hw.description ?? '',
        due_date: hw.due_date ?? '',
        assigned_date: hw.assigned_date ?? '',
      });
      setEditing(true);
    }
  };

  const mutation = useMutation({
    mutationFn: () => updateHomework(id, {
      title: form.title || undefined,
      subject: form.subject || undefined,
      description: form.description || undefined,
      due_date: form.due_date || undefined,
      assigned_date: form.assigned_date || undefined,
    }),
    onSuccess: () => {
      toast.success('Homework updated');
      qc.invalidateQueries({ queryKey: ['homework', id] });
      setEditing(false);
    },
    onError: () => toast.error('Failed to update homework'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!hw) return <p className="text-muted-foreground">Homework not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{hw.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{hw.subject}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant={hw.status === 'active' ? 'default' : 'secondary'}>{hw.status}</Badge>
          {hw.status !== 'cancelled' && (
            <Button size="sm" variant="outline" onClick={openEdit}>Edit</Button>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <Row label="Assigned Date" value={hw.assigned_date} />
          <Row label="Due Date" value={hw.due_date} />
          <Row label="Description" value={hw.description} />
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Edit Homework</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assigned Date</Label>
              <Input type="date" value={form.assigned_date} onChange={(e) => setForm((f) => ({ ...f, assigned_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <Link href="/homework" className="text-xs text-muted-foreground hover:text-foreground">← Back to homework</Link>
    </div>
  );
}
