'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { getStaffMember, getTeacherSubjects } from '@/lib/api/staff';
import { getSchool } from '@/lib/api/schools';
import { getStudent } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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

export default function ProfilePage() {
  const { role, entityId, schoolId, userId } = useAuthStore();

  const isStaff = role === 'teacher' || role === 'staff';
  const isStudent = role === 'student';

  const schoolQuery = useQuery({
    queryKey: ['school-profile', schoolId],
    queryFn: () => getSchool(schoolId!),
    enabled: !!schoolId,
  });

  const staffQuery = useQuery({
    queryKey: ['staff-self', entityId],
    queryFn: () => getStaffMember(entityId!).then((r) => r.data),
    enabled: isStaff && !!entityId,
  });

  const studentQuery = useQuery({
    queryKey: ['student-self', entityId],
    queryFn: () => getStudent(entityId!),
    enabled: isStudent && !!entityId,
  });

  const teacherSubjectsQuery = useQuery({
    queryKey: ['teacher-subjects-self', entityId],
    queryFn: () => getTeacherSubjects(entityId!).then((r) => r.data),
    enabled: isStaff && !!entityId,
  });

  const staff = staffQuery.data;
  const student = studentQuery.data?.data;
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
            {school.email && <DetailRow label="Email" value={school.email} />}
          </dl>
        </DataSection>
      )}

      <DataSection title="Account">
        <dl className="divide-y divide-slate-200 px-6">
          <DetailRow label="Role" value={role ?? '—'} />
          {userId && <DetailRow label="User ID" value={userId} />}
        </dl>
      </DataSection>

      {isStudent && (
        <DataSection title="Student details">
          {studentQuery.isLoading ? (
            <div className="p-6">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : student ? (
            <dl className="divide-y divide-slate-200 px-6">
              <DetailRow label="Name" value={student.name} />
              <DetailRow label="Roll number" value={student.roll_number} />
              <DetailRow label="Class" value={`${student.class_name} ${student.section}`} />
              {student.phone && <DetailRow label="Phone" value={student.phone} />}
              {student.dob && <DetailRow label="Date of birth" value={student.dob} />}
            </dl>
          ) : (
            <p className="px-6 py-8 text-sm text-slate-500">No student record linked</p>
          )}
        </DataSection>
      )}

      {isStaff && (
        <>
          <DataSection title="Staff details">
            {staffQuery.isLoading ? (
              <div className="p-6">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : staff ? (
              <dl className="divide-y divide-slate-200 px-6">
                <DetailRow label="Name" value={staff.name} />
                {staff.designation && <DetailRow label="Designation" value={staff.designation} />}
                {staff.category && (
                  <DetailRow label="Category" value={staff.category.charAt(0).toUpperCase() + staff.category.slice(1)} />
                )}
                {staff.emp_code && <DetailRow label="Employee code" value={staff.emp_code} />}
                {staff.mobile && <DetailRow label="Mobile" value={staff.mobile} />}
                {staff.email && <DetailRow label="Email" value={staff.email} />}
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
              <div className="p-6">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : teacherSubjects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Subject
                    </TableHead>
                    <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Class
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherSubjects.map((ts) => (
                    <TableRow key={ts.id} className="border-slate-200">
                      <TableCell className="px-6 py-4 text-slate-900">{ts.subject}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">
                        {ts.class_name ?? '—'}
                        {ts.section ? ` ${ts.section}` : ''}
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

      {(role === 'admin' || role === 'superadmin') && (
        <DataSection title="Administrator">
          <div className="px-6 py-4">
            <Badge variant="secondary" className="rounded-md border border-slate-200 capitalize">
              {role}
            </Badge>
          </div>
        </DataSection>
      )}
    </div>
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
