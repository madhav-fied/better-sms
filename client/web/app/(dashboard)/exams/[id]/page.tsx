'use client';
import { useQuery } from '@tanstack/react-query';
import { getExam, getExamSchedule } from '@/lib/api/exams';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { use } from 'react';

export default function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['exam', id], queryFn: () => getExam(id) });
  const { data: scheduleData } = useQuery({ queryKey: ['exam-schedule', id], queryFn: () => getExamSchedule(id) });
  const e = data?.data;
  const schedule = scheduleData?.data ?? [];

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!e) return <p className="text-gray-400">Exam not found</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{e.name}</h1>
        <div className="flex gap-2 items-center">
          <Badge>{e.status}</Badge>
          <Link href={`/exams/${id}/schedule`} className="text-sm text-blue-600 hover:underline">Edit Schedule</Link>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        <div className="flex gap-4"><span className="w-24 text-gray-400">Start Date</span><span>{e.start_date}</span></div>
        <div className="flex gap-4"><span className="w-24 text-gray-400">End Date</span><span>{e.end_date}</span></div>
      </div>
      {schedule.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 text-xs uppercase text-gray-500 font-medium">Schedule</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">Class</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Max Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {schedule.map((s: { id: string; subject_name: string; class_name: string; date: string; max_marks: number }) => (
                <tr key={s.id}>
                  <td className="px-4 py-2">{s.subject_name}</td>
                  <td className="px-4 py-2">{s.class_name}</td>
                  <td className="px-4 py-2 text-gray-500">{s.date}</td>
                  <td className="px-4 py-2">{s.max_marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
