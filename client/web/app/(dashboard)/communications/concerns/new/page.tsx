'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createConcern } from '@/lib/api/communications';
import { getStudents } from '@/lib/api/students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

export default function NewConcernPage() {
  const router = useRouter();
  const { data: wardsData } = useQuery({
    queryKey: ['concern-wards'],
    queryFn: () => getStudents({ limit: 20 }),
  });
  const wards = wardsData?.data ?? [];

  const [form, setForm] = useState({
    student_id: '',
    category: 'academic',
    subject: '',
    directed_to: 'class_teacher',
    initial_message: '',
  });

  const mutation = useMutation({
    mutationFn: () => createConcern(form),
    onSuccess: (res) => {
      toast.success('Concern submitted');
      router.push(`/communications/concerns/${res.data?.id}`);
    },
    onError: () => toast.error('Failed to submit concern'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Raise a concern"
        description="Submit a concern to school staff. You will receive updates in your concerns list."
        actions={
          <ActionLink href="/communications/concerns" variant="outline">
            Back to concerns
          </ActionLink>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {wards.length > 0 && (
            <LabeledSelect
              label="Student"
              value={form.student_id}
              onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
              options={wards.map((w: { id: string; name: string }) => ({ value: w.id, label: w.name }))}
              placeholder="Select student"
            />
          )}
          <LabeledSelect
            label="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            options={[
              { value: 'academic', label: 'Academic' },
              { value: 'discipline', label: 'Discipline' },
              { value: 'transport', label: 'Transport' },
              { value: 'fee', label: 'Fee' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-slate-700">
              Subject
            </Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <LabeledSelect
            label="Direct to"
            value={form.directed_to}
            onChange={(e) => setForm((f) => ({ ...f, directed_to: e.target.value }))}
            options={[
              { value: 'class_teacher', label: 'Class teacher' },
              { value: 'admin', label: 'Administration' },
            ]}
          />
          <div className="space-y-1.5">
            <Label htmlFor="message" className="text-slate-700">
              Message
            </Label>
            <textarea
              id="message"
              rows={5}
              value={form.initial_message}
              onChange={(e) => setForm((f) => ({ ...f, initial_message: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
        <Button
          className="mt-6"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.subject || !form.initial_message}
        >
          {mutation.isPending ? 'Submitting…' : 'Submit concern'}
        </Button>
      </section>
    </div>
  );
}
