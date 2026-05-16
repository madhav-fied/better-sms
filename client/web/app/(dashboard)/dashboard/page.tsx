'use client';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getBirthdays } from '@/lib/api/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
  const birthdays = useQuery({ queryKey: ['birthdays'], queryFn: getBirthdays });

  const s = summary.data?.data;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summary.isLoading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          : (
            <>
              <StatCard label="Total Students" value={s?.total_students ?? 0} color="text-indigo-600" />
              <StatCard label="Total Staff" value={s?.total_staff ?? 0} color="text-violet-600" />
              <StatCard label="Male Students" value={s?.total_male_students ?? 0} color="text-blue-600" />
              <StatCard label="Female Students" value={s?.total_female_students ?? 0} color="text-pink-600" />
            </>
          )}
      </div>

      {/* Birthdays */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Today&apos;s Birthdays</CardTitle>
        </CardHeader>
        <CardContent>
          {birthdays.isLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <ul className="text-sm divide-y">
              {((birthdays.data?.data?.birthdays) ?? []).map(
                (b: { type: string; id: string; name: string; dob: string }, i: number) => (
                  <li key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${b.type === 'student' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {b.type}
                      </span>
                      <span>{b.name}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{b.dob}</span>
                  </li>
                )
              )}
              {((birthdays.data?.data?.birthdays) ?? []).length === 0 && (
                <li className="py-6 text-center text-gray-400">No birthdays today</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-gray-500 uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
