'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createExam } from '@/lib/api/exams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function NewExamPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });

  const mutation = useMutation({
    mutationFn: () => createExam(form),
    onSuccess: (res) => { toast.success('Exam created'); router.push(`/exams/${res.data?.id}`); },
    onError: () => toast.error('Failed'),
  });

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">New Exam</h1>
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? 'Creating…' : 'Create Exam'}
        </Button>
      </div>
    </div>
  );
}
