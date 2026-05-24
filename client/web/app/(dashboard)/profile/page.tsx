'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { getStaffMember, getTeacherSubjects } from '@/lib/api/staff';
import { getSchool } from '@/lib/api/schools';
import { changePassword } from '@/lib/api/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { role, entityId, schoolId, userId } = useAuthStore();
  const isTeacher = role === 'teacher';
  const canChangePassword = role === 'admin' || role === 'teacher';

  const schoolQuery = useQuery({
    queryKey: ['school-profile', schoolId],
    queryFn: () => getSchool(schoolId!),
    enabled: !!schoolId,
  });

  const staffQuery = useQuery({
    queryKey: ['staff-self', entityId],
    queryFn: () => getStaffMember(entityId!).then((r) => r.data),
    enabled: isTeacher && !!entityId,
  });

  const teacherSubjectsQuery = useQuery({
    queryKey: ['teacher-subjects-self', entityId],
    queryFn: () => getTeacherSubjects(entityId!).then((r) => r.data),
    enabled: isTeacher && !!entityId,
  });

  const staff = staffQuery.data;
  const school = schoolQuery.data?.data;
  const teacherSubjects: { id: string; subject: string; class_name?: string; section?: string }[] =
    teacherSubjectsQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="My profile" description="Your account details and school information." />

      {school && (
        <DataSection title="School">
          <dl className="divide-y divide-slate-200 px-6">
            <DetailRow label="School name" value={school.name} />
            {school.branch_name && <DetailRow label="Branch" value={school.branch_name} />}
            {school.phone && <DetailRow label="Phone" value={school.phone} />}
          </dl>
        </DataSection>
      )}

      <DataSection title="Account">
        <dl className="divide-y divide-slate-200 px-6">
          <DetailRow label="Role" value={role ?? '—'} />
          {userId && <DetailRow label="User ID" value={userId} />}
        </dl>
      </DataSection>

      {isTeacher && (
        <>
          <DataSection title="Staff details">
            {staffQuery.isLoading ? (
              <div className="p-6"><Skeleton className="h-16 w-full" /></div>
            ) : staff ? (
              <dl className="divide-y divide-slate-200 px-6">
                <DetailRow label="Name" value={staff.name} />
                {staff.designation && <DetailRow label="Designation" value={staff.designation} />}
                {staff.emp_code && <DetailRow label="Employee code" value={staff.emp_code} />}
                {staff.mobile && <DetailRow label="Mobile" value={staff.mobile} />}
                <div className="py-4">
                  <Badge variant={staff.is_active ? 'default' : 'secondary'} className="rounded-md border border-slate-200">
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </dl>
            ) : (
              <p className="px-6 py-8 text-sm text-slate-500">No staff record linked</p>
            )}
          </DataSection>

          <DataSection title="Teaching assignments">
            {teacherSubjectsQuery.isLoading ? (
              <div className="p-6"><Skeleton className="h-16 w-full" /></div>
            ) : teacherSubjects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Subject</TableHead>
                    <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Class</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherSubjects.map((ts) => (
                    <TableRow key={ts.id} className="border-slate-200">
                      <TableCell className="px-6 py-4 text-slate-900">{ts.subject}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">
                        {ts.class_name ?? '—'}{ts.section ? ` ${ts.section}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="px-6 py-8 text-sm text-slate-500">No teaching assignments</p>
            )}
          </DataSection>
        </>
      )}

      {canChangePassword && <ChangePasswordSection />}
    </div>
  );
}

function ChangePasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!next) { toast.error('New password is required'); return; }
    if (next !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await changePassword({ new_password: next, current_password: current || undefined });
      toast.success('Password updated');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail ?? 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DataSection title="Change password">
      <div className="space-y-4 px-6 py-4">
        <div className="space-y-2">
          <Label htmlFor="cp-current">Current password</Label>
          <Input id="cp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-new">New password</Label>
          <Input id="cp-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-confirm">Confirm new password</Label>
          <Input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        <Button onClick={handleSubmit} disabled={loading || !next || !confirm}>
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </DataSection>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}
