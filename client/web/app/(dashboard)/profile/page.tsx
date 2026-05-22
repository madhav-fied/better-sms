'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { getStaffMember, getTeacherSubjects } from '@/lib/api/staff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { role, entityId, schoolName, schoolBranchName, schoolId } = useAuthStore();

  const schoolDisplay = schoolBranchName ? `${schoolName} — ${schoolBranchName}` : schoolName;

  const isStaff = role === 'teacher' || role === 'staff';

  const staffQuery = useQuery({
    queryKey: ['staff-self', entityId],
    queryFn: () => getStaffMember(entityId!).then((r) => r.data),
    enabled: isStaff && !!entityId,
  });

  const teacherSubjectsQuery = useQuery({
    queryKey: ['teacher-subjects-self', entityId],
    queryFn: () => getTeacherSubjects(entityId!).then((r) => r.data),
    enabled: isStaff && !!entityId,
  });

  const staff = staffQuery.data;
  const teacherSubjects: { id: string; subject: string; class_name?: string; section?: string }[] =
    teacherSubjectsQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">My Profile</h1>

      {/* School */}
      {schoolDisplay && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase tracking-wide">School</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold text-gray-900">{schoolDisplay}</p>
            {schoolId && <p className="text-xs text-gray-400 mt-0.5">{schoolId}</p>}
          </CardContent>
        </Card>
      )}

      {/* Staff / Teacher */}
      {isStaff && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Staff Details</CardTitle>
            </CardHeader>
            <CardContent>
              {staffQuery.isLoading ? (
                <Skeleton className="h-16" />
              ) : staff ? (
                <div className="space-y-2">
                  <p className="text-base font-semibold text-gray-900">{staff.name}</p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    {staff.designation && <Row label="Designation" value={staff.designation} />}
                    {staff.category && (
                      <Row label="Category" value={staff.category.charAt(0).toUpperCase() + staff.category.slice(1)} />
                    )}
                    {staff.emp_code && <Row label="Emp. Code" value={staff.emp_code} />}
                    {staff.mobile && <Row label="Mobile" value={staff.mobile} />}
                    {staff.email && <Row label="Email" value={staff.email} />}
                  </dl>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No staff record linked</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Teaching Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {teacherSubjectsQuery.isLoading ? (
                <Skeleton className="h-16" />
              ) : teacherSubjects.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-1.5 font-medium">Subject</th>
                      <th className="pb-1.5 font-medium">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {teacherSubjects.map((ts) => (
                      <tr key={ts.id}>
                        <td className="py-1.5 text-gray-900">{ts.subject}</td>
                        <td className="py-1.5 text-gray-500">
                          {ts.class_name ?? '—'}{ts.section ? ` ${ts.section}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400">No teaching assignments</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Admin */}
      {role === 'admin' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Administrator</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm mt-1">
              {schoolId && <Row label="School ID" value={schoolId} />}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Superadmin */}
      {role === 'superadmin' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Super Admin</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </>
  );
}
