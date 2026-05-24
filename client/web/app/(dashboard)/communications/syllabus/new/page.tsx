'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createSyllabus } from '@/lib/api/communications';
import apiClient from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { useActiveAY } from '@/hooks/useActiveAY';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

export default function NewSyllabusPage() {
  const router = useRouter();
  const { data: activeAy } = useActiveAY();
  const [form, setForm] = useState({ class_section_id: '', subject: '', title: '', description: '' });

  const { data: sections } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!activeAy?.id) throw new Error('No active academic year');
      return createSyllabus({ academic_year_id: activeAy.id, ...form });
    },
    onSuccess: () => {
      toast.success('Syllabus created');
      router.push('/communications/syllabus');
    },
    onError: () => toast.error('Failed to create syllabus'),
  });

  const sectionOptions = (sections ?? []).map((s: { id: string; class_name: string; section: string }) => ({
    value: s.id,
    label: `${s.class_name} ${s.section}`,
  }));

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="New syllabus"
        description="Add a syllabus document for a class and subject."
        actions={<ActionLink href="/communications/syllabus" variant="outline">Back to syllabus</ActionLink>}
      />
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <LabeledSelect label="Class section" value={form.class_section_id} onChange={(e) => setForm((f) => ({ ...f, class_section_id: e.target.value }))} options={sectionOptions} />
        <div className="space-y-2">
          <Label htmlFor="syllabus-subject" className="text-slate-700">Subject</Label>
          <Input id="syllabus-subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="syllabus-title" className="text-slate-700">Title</Label>
          <Input id="syllabus-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="syllabus-desc" className="text-slate-700">Description</Label>
          <textarea id="syllabus-desc" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm min-h-[100px]" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.class_section_id || !form.subject || !form.title}>
          {mutation.isPending ? 'Creating…' : 'Create syllabus'}
        </Button>
      </section>
    </div>
  );
}
