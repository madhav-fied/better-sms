'use client';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getBirthdays } from '@/lib/api/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

export default function DashboardPage() {
  const { role } = useRole();
  if (role === 'parent') {
    return (
      <div className="space-y-4 max-w-lg">
        <h1 className="text-xl font-semibold">Parent Portal</h1>
        <p className="text-sm text-gray-500">View school updates and reach out to staff.</p>
        <div className="grid gap-2">
          <Link href="/communications/notices" className="rounded-lg border bg-white p-4 hover:bg-gray-50 text-sm font-medium">
            School Notices →
          </Link>
          <Link href="/communications/concerns" className="rounded-lg border bg-white p-4 hover:bg-gray-50 text-sm font-medium">
            Raise a Concern →
          </Link>
        </div>
      </div>
    );
  }
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
  const birthdays = useQuery({ queryKey: ['birthdays'], queryFn: getBirthdays });

  const s = summary.data?.data;
  const birthdayList = birthdays.data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        {summary.isLoading
          ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          : (
            <>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Total Students</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{s?.students ?? s?.total_students ?? '—'}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Total Staff</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{s?.staff ?? s?.total_staff ?? '—'}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Academic Year</CardTitle></CardHeader>
                <CardContent><p className="text-lg font-semibold">{s?.ay_label ?? '—'}</p></CardContent>
              </Card>
            </>
          )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Birthdays Today</CardTitle></CardHeader>
        <CardContent>
          {birthdays.isLoading ? <Skeleton className="h-20" /> : (
            <ul className="text-sm divide-y">
              {birthdayList.slice(0, 12).map(
                (b: { name: string; dob: string; type?: string }, i: number) => (
                  <li key={i} className="flex justify-between py-2">
                    <span>{b.name} <span className="text-gray-400 capitalize">({b.type})</span></span>
                    <span className="text-gray-400">{b.dob}</span>
                  </li>
                )
              )}
              {birthdayList.length === 0 && (
                <li className="py-4 text-center text-gray-400">No birthdays today</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
