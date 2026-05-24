'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createStaff } from '@/lib/api/staff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

export default function NewStaffPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    emp_code: '',
    name: '',
    gender: 'male',
    category: 'teacher',
    mobile: '',
    email: '',
  });

  const mutation = useMutation({
    mutationFn: () => createStaff(form),
    onSuccess: (res) => {
      toast.success('Staff created');
      router.push(`/staff/${res.data?.id}`);
    },
    onError: () => toast.error('Failed to create staff'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Add staff"
        description="Create a new staff member record."
        actions={
          <ActionLink href="/staff" variant="outline">
            Back to staff
          </ActionLink>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emp-code" className="text-slate-700">
              Employee code
            </Label>
            <Input id="emp-code" value={form.emp_code} onChange={set('emp_code')} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700">
              Name
            </Label>
            <Input id="name" value={form.name} onChange={set('name')} className="border-slate-200" />
          </div>
          <LabeledSelect
            label="Gender"
            value={form.gender}
            onChange={set('gender')}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
            placeholder="Select gender"
          />
          <LabeledSelect
            label="Category"
            value={form.category}
            onChange={set('category')}
            options={[
              { value: 'teacher', label: 'Teacher' },
              { value: 'peon', label: 'Peon' },
              { value: 'clerk', label: 'Clerk' },
              { value: 'accounts', label: 'Accounts' },
              { value: 'receptionist', label: 'Receptionist' },
              { value: 'security', label: 'Security' },
              { value: 'other', label: 'Other' },
            ]}
            placeholder="Select category"
          />
          <div className="space-y-1.5">
            <Label htmlFor="mobile" className="text-slate-700">
              Mobile
            </Label>
            <Input id="mobile" value={form.mobile} onChange={set('mobile')} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700">
              Email
            </Label>
            <Input id="email" type="email" value={form.email} onChange={set('email')} className="border-slate-200" />
          </div>
        </div>
        <Button
          className="mt-6"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.emp_code || !form.name}
        >
          {mutation.isPending ? 'Saving…' : 'Create staff'}
        </Button>
      </section>
    </div>
  );
}
