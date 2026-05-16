'use client';
import { useMutation } from '@tanstack/react-query';
import { createHomework } from '@/lib/api/homework';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewHomeworkPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', subject: '', due_date: '', class_section_id: '' });

  const mutation = useMutation({
    mutationFn: () => createHomework(form),
    onSuccess: () => { toast.success('Homework created'); router.push('/homework'); },
    onError: () => toast.error('Failed to create homework'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">New Homework</h1>
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={form.title} onChange={set('title')} />
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={form.subject} onChange={set('subject')} />
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
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title}>
          {mutation.isPending ? 'Creating…' : 'Create Homework'}
        </Button>
      </div>
    </div>
  );
}
