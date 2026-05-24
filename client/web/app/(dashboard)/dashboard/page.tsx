'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getBirthdays } from '@/lib/api/dashboard';
import { getStudent } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/useRole';
import { useAuthStore } from '@/store/auth';
import PageHeader from '@/components/layout/PageHeader';
import PageHero from '@/components/enterprise/PageHero';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';

function ParentDashboard() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Parent portal" description="Stay connected with school updates and communicate with staff." />
      <PageHero
        title="Welcome back"
        subtitle="Access notices, homework, results, and raise concerns — all in one place."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/communications/notices" variant="outline" className="justify-center px-6 py-4">
          School notices
        </ActionLink>
        <ActionLink href="/homework" variant="outline" className="justify-center px-6 py-4">
          Homework
        </ActionLink>
        <ActionLink href="/results" variant="outline" className="justify-center px-6 py-4">
          Results
        </ActionLink>
        <ActionLink href="/timetable" variant="outline" className="justify-center px-6 py-4">
          Timetable
        </ActionLink>
        <ActionLink href="/communications/concerns/new" variant="default" className="justify-center px-6 py-4 sm:col-span-2">
          Raise a concern
        </ActionLink>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const entityId = useAuthStore((s) => s.entityId);
  const { data } = useQuery({
    queryKey: ['student-self', entityId],
    queryFn: () => getStudent(entityId!),
    enabled: !!entityId,
  });
  const student = data?.data;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="My class"
        description={student ? `${student.class_name} ${student.section} · Roll ${student.roll_number}` : 'Your class resources and updates.'}
      />
      <PageHero
        title={student?.name ?? 'Student portal'}
        subtitle="Quick links to homework, timetable, results, and school notices."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionLink href="/homework" variant="outline" className="justify-center px-6 py-4">
          Homework
        </ActionLink>
        <ActionLink href="/timetable" variant="outline" className="justify-center px-6 py-4">
          Timetable
        </ActionLink>
        <ActionLink href="/results" variant="outline" className="justify-center px-6 py-4">
          My results
        </ActionLink>
        <ActionLink href="/communications/notices" variant="outline" className="justify-center px-6 py-4">
          Notices
        </ActionLink>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
  const birthdays = useQuery({ queryKey: ['birthdays'], queryFn: getBirthdays });

  const s = summary.data?.data;
  const birthdayList = birthdays.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your school's key metrics and today's birthdays." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.isLoading ? (
          Array(3)
            .fill(0)
            .map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total students</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{s?.students ?? s?.total_students ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total staff</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{s?.staff ?? s?.total_staff ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Academic year</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{s?.ay_label ?? '—'}</p>
            </div>
          </>
        )}
      </div>

      <DataSection title="Birthdays today">
        {birthdays.isLoading ? (
          <div className="p-6">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {birthdayList.slice(0, 12).map((b: { name: string; dob: string; type?: string }, i: number) => (
              <li key={i} className="flex items-center justify-between px-6 py-3 text-sm">
                <span className="text-slate-900">
                  {b.name} <span className="text-slate-400 capitalize">({b.type})</span>
                </span>
                <span className="text-slate-500">{b.dob}</span>
              </li>
            ))}
            {birthdayList.length === 0 && (
              <li className="px-6 py-8 text-center text-sm text-slate-500">No birthdays today</li>
            )}
          </ul>
        )}
      </DataSection>
    </div>
  );
}

export default function DashboardPage() {
  const { role } = useRole();
  if (role === 'parent') return <ParentDashboard />;
  if (role === 'student') return <StudentDashboard />;
  return <AdminDashboard />;
}
