'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchool, updateSchool } from '@/lib/api/schools';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

export default function SchoolSettingsPage() {
  const qc = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);

  const { data, isLoading } = useQuery({
    queryKey: ['school-settings', schoolId],
    queryFn: () => getSchool(schoolId!),
    enabled: !!schoolId,
  });

  const school = data?.data;

  const [form, setForm] = useState({
    name: '',
    branch_name: '',
    address: '',
    phone: '',
    email: '',
    attendance_mode: 'daily',
    uses_saturday: 'true',
  });

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name ?? '',
        branch_name: school.branch_name ?? '',
        address: school.address ?? '',
        phone: school.phone ?? '',
        email: school.email ?? '',
        attendance_mode: school.attendance_mode ?? 'daily',
        uses_saturday: school.uses_saturday ? 'true' : 'false',
      });
    }
  }, [school]);

  const mutation = useMutation({
    mutationFn: () =>
      updateSchool(schoolId!, {
        name: form.name,
        branch_name: form.branch_name || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        attendance_mode: form.attendance_mode,
        uses_saturday: form.uses_saturday === 'true',
      }),
    onSuccess: () => {
      toast.success('School settings updated');
      qc.invalidateQueries({ queryKey: ['school-settings'] });
    },
    onError: () => toast.error('Failed to update school settings'),
  });

  if (!schoolId) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">No school selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="School settings" description="Configure your school's profile and operational preferences." />

      <DataSection title="School profile">
        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="school-name" className="text-slate-700">
              School name
            </Label>
            <Input
              id="school-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-name" className="text-slate-700">
              Branch name
            </Label>
            <Input
              id="branch-name"
              value={form.branch_name}
              onChange={(e) => setForm((f) => ({ ...f, branch_name: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-slate-700">
              Address
            </Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="border-slate-200"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-slate-700">
                Phone
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="border-slate-200"
              />
            </div>
          </div>
          <LabeledSelect
            label="Attendance mode"
            value={form.attendance_mode}
            onChange={(e) => setForm((f) => ({ ...f, attendance_mode: e.target.value }))}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'period_wise', label: 'Period wise' },
            ]}
          />
          <LabeledSelect
            label="Saturday classes"
            value={form.uses_saturday}
            onChange={(e) => setForm((f) => ({ ...f, uses_saturday: e.target.value }))}
            options={[
              { value: 'true', label: 'Yes — include Saturday in timetable' },
              { value: 'false', label: 'No — hide Saturday' },
            ]}
          />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
            {mutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </DataSection>
    </div>
  );
}
