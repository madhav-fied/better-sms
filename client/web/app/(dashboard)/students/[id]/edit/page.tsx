'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getStudent, updateStudent, getClassSections } from '@/lib/api/students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

export default function StudentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const { data: sectionsData } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => getClassSections(),
  });

  const student = data?.data;
  const sections = sectionsData?.data ?? [];

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    roll_number: '',
    sms_mobile: '',
    dob: '',
    contact_address: '',
    class_section_id: '',
  });

  useEffect(() => {
    if (student) {
      const parts = student.name.split(' ');
      setForm({
        first_name: parts[0] ?? '',
        last_name: parts.slice(1).join(' '),
        roll_number: student.roll_number ?? '',
        sms_mobile: student.phone ?? '',
        dob: student.dob ?? '',
        contact_address: student.address ?? '',
        class_section_id: student.class_section_id ?? '',
      });
    }
  }, [student]);

  const mutation = useMutation({
    mutationFn: () =>
      updateStudent(id, {
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        roll_number: form.roll_number || undefined,
        sms_mobile: form.sms_mobile || undefined,
        dob: form.dob || undefined,
        contact_address: form.contact_address || undefined,
        class_section_id: form.class_section_id || undefined,
      }),
    onSuccess: () => {
      toast.success('Student updated');
      router.push(`/students/${id}`);
    },
    onError: () => toast.error('Failed to update student'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Student not found</p>
        <ActionLink href="/students" className="mt-4">
          Back to students
        </ActionLink>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={`Edit — ${student.name}`}
        description="Update student profile and enrollment details."
        actions={
          <ActionLink href={`/students/${id}`} variant="outline">
            Cancel
          </ActionLink>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first-name" className="text-slate-700">
              First name
            </Label>
            <Input
              id="first-name"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name" className="text-slate-700">
              Last name
            </Label>
            <Input
              id="last-name"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roll-number" className="text-slate-700">
              Roll number
            </Label>
            <Input
              id="roll-number"
              value={form.roll_number}
              onChange={(e) => setForm((f) => ({ ...f, roll_number: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobile" className="text-slate-700">
              Mobile
            </Label>
            <Input
              id="mobile"
              value={form.sms_mobile}
              onChange={(e) => setForm((f) => ({ ...f, sms_mobile: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob" className="text-slate-700">
              Date of birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={form.dob}
              onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <LabeledSelect
            label="Class section"
            value={form.class_section_id}
            onChange={(e) => setForm((f) => ({ ...f, class_section_id: e.target.value }))}
            options={sections.map((c: { id: string; class_name: string; section: string }) => ({
              value: c.id,
              label: `${c.class_name} ${c.section}`,
            }))}
            placeholder="Select class"
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address" className="text-slate-700">
              Address
            </Label>
            <Input
              id="address"
              value={form.contact_address}
              onChange={(e) => setForm((f) => ({ ...f, contact_address: e.target.value }))}
              className="border-slate-200"
            />
          </div>
        </div>
        <Button
          className="mt-6"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.first_name}
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </section>
    </div>
  );
}
