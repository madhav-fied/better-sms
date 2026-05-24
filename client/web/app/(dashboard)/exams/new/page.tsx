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
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

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
    onSuccess: (res) => {
      toast.success('Exam created');
      router.push(`/exams/${res.data?.id}`);
    },
    onError: () => toast.error('Failed — set an active academic year in Settings'),
  });

  return (
    <div className="space-y-6 max-w-sm">
      <PageHeader
        title="New exam"
        description="Create an exam term for the active academic year."
        actions={
          <ActionLink href="/exams" variant="outline">
            Back to exams
          </ActionLink>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exam-name" className="text-slate-700">
              Name
            </Label>
            <Input
              id="exam-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <LabeledSelect
            label="Type"
            value={form.exam_type}
            onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value }))}
            options={[
              { value: 'unit_test', label: 'Unit test' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'half_yearly', label: 'Half yearly' },
              { value: 'annual', label: 'Annual' },
              { value: 'other', label: 'Other' },
            ]}
            placeholder="Select type"
          />
        </div>
        <Button className="mt-6" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? 'Creating…' : 'Create exam'}
        </Button>
      </section>
    </div>
  );
}
