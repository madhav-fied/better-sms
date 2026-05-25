'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createEnquiry } from '@/lib/api/admissions';
import { getClassSections } from '@/lib/api/students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

export default function NewEnquiryPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    parent_name: '',
    student_name: '',
    mobile: '',
    dob: '',
    date: today,
    class_section_id: '',
    notes: '',
  });

  const { data: sectionsData } = useQuery({ queryKey: ['class-sections'], queryFn: () => getClassSections() });
  const sections: { id: string; class_name: string; section: string }[] = sectionsData?.data ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      createEnquiry({
        ...form,
        purpose: 'new_admission',
        dob: form.dob || undefined,
        class_section_id: form.class_section_id || undefined,
      }),
    onSuccess: (res) => {
      toast.success('Enquiry created');
      router.push(`/admissions/enquiries/${res.data?.id}`);
    },
    onError: () => toast.error('Failed to create enquiry'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="New enquiry"
        description="Record a new admission enquiry from a prospective parent."
        actions={
          <ActionLink href="/admissions/enquiries" variant="outline">
            Back to enquiries
          </ActionLink>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="parent-name" className="text-slate-700">Parent name</Label>
            <Input id="parent-name" value={form.parent_name} onChange={set('parent_name')} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="student-name" className="text-slate-700">Student name</Label>
            <Input id="student-name" value={form.student_name} onChange={set('student_name')} className="border-slate-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-slate-700">Mobile</Label>
              <Input id="mobile" value={form.mobile} onChange={set('mobile')} className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob" className="text-slate-700">Date of birth</Label>
              <Input id="dob" type="date" value={form.dob} onChange={set('dob')} className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-slate-700">Enquiry date</Label>
              <Input id="date" type="date" value={form.date} onChange={set('date')} className="border-slate-200" />
            </div>
            <LabeledSelect
              label="Intended class"
              value={form.class_section_id}
              onChange={set('class_section_id')}
              options={sections.map((s) => ({ value: s.id, label: `${s.class_name} ${s.section}` }))}
              placeholder="Select class (optional)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-slate-700">Notes</Label>
            <textarea
              id="notes"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
            />
          </div>
        </div>
        <Button
          className="mt-6"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.parent_name || !form.student_name || !form.mobile}
        >
          {mutation.isPending ? 'Saving…' : 'Create enquiry'}
        </Button>
      </section>
    </div>
  );
}
