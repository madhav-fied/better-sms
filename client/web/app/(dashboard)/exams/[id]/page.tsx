'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExam, getExamSchedule, updateExam } from '@/lib/api/exams';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { toast } from 'sonner';
import { use } from 'react';

export default function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['exam', id], queryFn: () => getExam(id) });
  const { data: scheduleData } = useQuery({ queryKey: ['exam-schedule', id], queryFn: () => getExamSchedule(id) });
  const e = data?.data;
  const schedule = scheduleData?.data ?? [];

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });

  const openEdit = () => {
    if (e) { setForm({ name: e.name ?? '', start_date: e.start_date ?? '', end_date: e.end_date ?? '' }); setEditing(true); }
  };

  const mutation = useMutation({
    mutationFn: () => updateExam(id, {
      name: form.name || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    }),
    onSuccess: () => {
      toast.success('Exam updated');
      qc.invalidateQueries({ queryKey: ['exam', id] });
      setEditing(false);
    },
    onError: () => toast.error('Failed to update exam'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!e) return <p className="text-gray-400">Exam not found</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{e.name}</h1>
        <div className="flex gap-2 items-center">
          <Badge>{e.status}</Badge>
          {!editing && (
            <Button size="sm" variant="outline" onClick={openEdit}>Edit</Button>
          )}
          <Link href={`/exams/${id}/schedule`} className="text-sm text-blue-600 hover:underline">Edit Schedule</Link>
        </div>
      </div>

      {!editing ? (
        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <div className="flex gap-4"><span className="w-24 text-gray-400">Start Date</span><span>{e.start_date}</span></div>
          <div className="flex gap-4"><span className="w-24 text-gray-400">End Date</span><span>{e.end_date}</span></div>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Edit Exam</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

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
