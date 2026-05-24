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
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';

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
    mutationFn: () =>
      updateHomework(id, {
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

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!hw) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Homework not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title={hw.title}
        description={hw.subject}
        actions={
          <>
            <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize">{hw.status}</Badge>
            {hw.status !== 'cancelled' && !editing && (
              <Button size="sm" variant="outline" onClick={openEdit}>
                Edit
              </Button>
            )}
            <ActionLink href="/homework" variant="outline">
              Back to homework
            </ActionLink>
          </>
        }
      />

      {!editing ? (
        <DataSection title="Assignment details">
          <dl className="divide-y divide-slate-200 px-6">
            {hw.assigned_date && <DetailRow label="Assigned date" value={hw.assigned_date} />}
            {hw.due_date && <DetailRow label="Due date" value={hw.due_date} />}
            {hw.description && <DetailRow label="Description" value={hw.description} />}
          </dl>
        </DataSection>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Edit homework</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-slate-700">
                Title
              </Label>
              <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-slate-700">
                Subject
              </Label>
              <Input id="subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assigned" className="text-slate-700">
                  Assigned date
                </Label>
                <Input id="assigned" type="date" value={form.assigned_date} onChange={(e) => setForm((f) => ({ ...f, assigned_date: e.target.value }))} className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due" className="text-slate-700">
                  Due date
                </Label>
                <Input id="due" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="border-slate-200" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-700">
                Description
              </Label>
              <textarea
                id="description"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="text-sm leading-relaxed text-slate-900">{value}</dd>
    </div>
  );
}
