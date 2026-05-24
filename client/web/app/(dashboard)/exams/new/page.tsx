'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createExam } from '@/lib/api/exams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useActiveAY } from '@/hooks/useActiveAY';

export default function NewExamPage() {
  const router = useRouter();
  const { data: activeAy } = useActiveAY();
  const [form, setForm] = useState({ name: '', exam_type: 'unit_test' });

  const mutation = useMutation({
    mutationFn: () => {
      if (!activeAy?.id) throw new Error('No active academic year');
      return createExam({
        academic_year_id: activeAy.id,
        name: form.name,
        exam_type: form.exam_type,
      });
    },
    onSuccess: (res) => { toast.success('Exam created'); router.push(`/exams/${res.data?.id}`); },
    onError: () => toast.error('Failed — set an active academic year in Settings'),
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
          <Label>Type</Label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={form.exam_type}
            onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value }))}
          >
            <option value="unit_test">Unit test</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="half_yearly">Half yearly</option>
            <option value="annual">Annual</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? 'Creating…' : 'Create Exam'}
        </Button>
      </div>
    </div>
  );
}
