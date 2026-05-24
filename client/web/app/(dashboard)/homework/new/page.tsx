'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { createHomework } from '@/lib/api/homework';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import apiClient from '@/lib/api/client';
import { useActiveAY } from '@/hooks/useActiveAY';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

export default function NewHomeworkPage() {
  const router = useRouter();
  const { data: activeAy } = useActiveAY();
  const { data: sections } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    due_date: '',
    class_section_id: '',
    assigned_date: today,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!activeAy?.id) throw new Error('No active academic year');
      return createHomework({
        ...form,
        academic_year_id: activeAy.id,
      });
    },
    onSuccess: () => {
      toast.success('Homework created');
      router.push('/homework');
    },
    onError: () => toast.error('Failed to create homework — set an active academic year in Settings'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="New homework"
        description="Assign homework to a class section."
        actions={
          <ActionLink href="/homework" variant="outline">
            Back to homework
          </ActionLink>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <LabeledSelect
            label="Class section"
            value={form.class_section_id}
            onChange={set('class_section_id')}
            options={(sections ?? []).map((cs: { id: string; class_name: string; section: string }) => ({
              value: cs.id,
              label: `${cs.class_name} ${cs.section}`,
            }))}
            placeholder="Select class"
          />
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-slate-700">
              Title
            </Label>
            <Input id="title" value={form.title} onChange={set('title')} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-slate-700">
              Subject
            </Label>
            <Input id="subject" value={form.subject} onChange={set('subject')} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assigned-date" className="text-slate-700">
              Assigned date
            </Label>
            <Input id="assigned-date" type="date" value={form.assigned_date} onChange={set('assigned_date')} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due-date" className="text-slate-700">
              Due date
            </Label>
            <Input id="due-date" type="date" value={form.due_date} onChange={set('due_date')} className="border-slate-200" />
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
              onChange={set('description')}
            />
          </div>
        </div>
        <Button
          className="mt-6"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.title || !form.class_section_id || !form.due_date}
        >
          {mutation.isPending ? 'Creating…' : 'Create homework'}
        </Button>
      </section>
    </div>
  );
}
