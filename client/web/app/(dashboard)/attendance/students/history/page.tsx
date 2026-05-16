'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudentAttendanceHistory } from '@/lib/api/attendance';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ClassSectionPicker } from '@/components/shared/ClassSectionPicker';

export default function AttendanceHistoryPage() {
  const [classSectionId, setClassSectionId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-history', classSectionId, month],
    queryFn: () => getStudentAttendanceHistory({ class_section_id: classSectionId, month }),
    enabled: !!classSectionId,
  });
  const records = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Attendance History</h1>
      <div className="flex gap-3 flex-wrap">
        <ClassSectionPicker
          value={classSectionId}
          onChange={setClassSectionId}
          className="w-56"
        />
        <input type="month" className="border rounded px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {classSectionId && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                  ))
                : records.map((r: { student_name: string; date: string; status: string }, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-3">{r.student_name}</td>
                      <td className="px-4 py-3 text-gray-500">{r.date}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === 'present' ? 'default' : r.status === 'leave' ? 'secondary' : 'destructive'}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
