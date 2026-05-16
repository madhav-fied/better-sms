'use client';
import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary,
  getClassAttendance,
  getBirthdays,
  getTeacherAttendanceSummary,
} from '@/lib/api/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
  const attendance = useQuery({ queryKey: ['class-attendance'], queryFn: getClassAttendance });
  const birthdays = useQuery({ queryKey: ['birthdays'], queryFn: getBirthdays });
  const staffSummary = useQuery({ queryKey: ['teacher-attendance-summary'], queryFn: getTeacherAttendanceSummary });

  const s = summary.data?.data;

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
                <CardContent><p className="text-3xl font-bold">{s?.students ?? '—'}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Total Staff</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{s?.staff ?? '—'}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500 uppercase tracking-wide">Academic Year</CardTitle></CardHeader>
                <CardContent><p className="text-lg font-semibold">{s?.ay_label ?? '—'}</p></CardContent>
              </Card>
            </>
          )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Student Attendance Today</CardTitle></CardHeader>
          <CardContent>
            {attendance.isLoading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={attendance.data?.data ?? []}>
                  <XAxis dataKey="class" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Present']} />
                  <Bar dataKey="present_pct" fill="#4f46e5" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Staff Today</CardTitle></CardHeader>
          <CardContent>
            {staffSummary.isLoading ? <Skeleton className="h-48" /> : (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Present</span>
                  <span className="font-medium text-green-600">{staffSummary.data?.data?.present ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Absent</span>
                  <span className="font-medium text-red-500">{staffSummary.data?.data?.absent ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">On leave</span>
                  <span className="font-medium text-amber-500">{staffSummary.data?.data?.on_leave ?? '—'}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Birthdays — Today & Next 7 Days</CardTitle></CardHeader>
        <CardContent>
          {birthdays.isLoading ? <Skeleton className="h-20" /> : (
            <ul className="text-sm divide-y">
              {(birthdays.data?.data ?? []).slice(0, 8).map(
                (b: { name: string; dob: string; class_name?: string }, i: number) => (
                  <li key={i} className="flex justify-between py-2">
                    <span>{b.name}</span>
                    <span className="text-gray-400">{b.dob}{b.class_name && ` · ${b.class_name}`}</span>
                  </li>
                )
              )}
              {(birthdays.data?.data ?? []).length === 0 && (
                <li className="py-4 text-center text-gray-400">No upcoming birthdays</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
