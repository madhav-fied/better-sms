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
    onSuccess: () => { toast.success('Homework created'); router.push('/homework'); },
    onError: () => toast.error('Failed to create homework — set an active academic year in Settings'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">New Homework</h1>
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Class section</Label>
          <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.class_section_id} onChange={set('class_section_id')}>
            <option value="">— select —</option>
            {(sections ?? []).map((cs: { id: string; class_name: string; section: string }) => (
              <option key={cs.id} value={cs.id}>{cs.class_name} {cs.section}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={form.title} onChange={set('title')} />
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={form.subject} onChange={set('subject')} />
        </div>
        <div className="space-y-1.5">
          <Label>Assigned date</Label>
          <Input type="date" value={form.assigned_date} onChange={set('assigned_date')} />
        </div>
        <div className="space-y-1.5">
          <Label>Due Date</Label>
          <Input type="date" value={form.due_date} onChange={set('due_date')} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            value={form.description}
            onChange={set('description')}
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.title || !form.class_section_id || !form.due_date}
        >
          {mutation.isPending ? 'Creating…' : 'Create Homework'}
        </Button>
      </div>
    </div>
  );
}
