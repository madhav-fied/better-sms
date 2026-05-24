'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExam, getExamSchedule, saveExamSchedule } from '@/lib/api/exams';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

interface ScheduleRow {
  class_section_id: string;
  subject: string;
  exam_date: string;
  max_marks: string;
  passing_marks: string;
}

const emptyRow = (): ScheduleRow => ({
  class_section_id: '',
  subject: '',
  exam_date: '',
  max_marks: '100',
  passing_marks: '35',
});

export default function ExamSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [rows, setRows] = useState<ScheduleRow[]>([emptyRow()]);

  const { data: examData, isLoading: loadingExam } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => getExam(id),
  });
  const { data: scheduleData, isLoading: loadingSchedule } = useQuery({
    queryKey: ['exam-schedule', id],
    queryFn: () => getExamSchedule(id),
  });
  const { data: sections } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient.get('/subjects').then((r) => r.data?.data ?? []),
  });

  const exam = examData?.data;
  const schedule = scheduleData?.data ?? [];

  useEffect(() => {
    if (schedule.length > 0) {
      setRows(
        schedule.map((s: { class_section_id: string; subject: string; exam_date?: string; max_marks: number; passing_marks: number }) => ({
          class_section_id: s.class_section_id,
          subject: s.subject,
          exam_date: s.exam_date ?? '',
          max_marks: String(s.max_marks),
          passing_marks: String(s.passing_marks),
        })),
      );
    }
  }, [schedule]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveExamSchedule(
        id,
        rows
          .filter((r) => r.class_section_id && r.subject)
          .map((r) => ({
            class_section_id: r.class_section_id,
            subject: r.subject,
            exam_date: r.exam_date || undefined,
            max_marks: Number(r.max_marks),
            passing_marks: Number(r.passing_marks),
          })),
      ),
    onSuccess: () => {
      toast.success('Schedule saved');
      qc.invalidateQueries({ queryKey: ['exam-schedule', id] });
    },
    onError: () => toast.error('Failed to save schedule'),
  });

  const updateRow = (index: number, field: keyof ScheduleRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  if (loadingExam) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={`Schedule — ${exam?.name ?? 'Exam'}`}
        description="Define subject-wise exam dates, classes, and marking scheme."
        actions={
          <>
            <ActionLink href={`/exams/${id}`} variant="outline">
              Back to exam
            </ActionLink>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save schedule'}
            </Button>
          </>
        }
      />

      <DataSection
        title="Schedule entries"
        actions={
          <Button size="sm" variant="outline" onClick={() => setRows((r) => [...r, emptyRow()])}>
            Add row
          </Button>
        }
      >
        {loadingSchedule ? (
          <div className="p-6">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {rows.map((row, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <LabeledSelect
                  label="Class"
                  value={row.class_section_id}
                  onChange={(e) => updateRow(index, 'class_section_id', e.target.value)}
                  options={(sections ?? []).map((c: { id: string; class_name: string; section: string }) => ({
                    value: c.id,
                    label: `${c.class_name} ${c.section}`,
                  }))}
                  placeholder="Select class"
                />
                <LabeledSelect
                  label="Subject"
                  value={row.subject}
                  onChange={(e) => updateRow(index, 'subject', e.target.value)}
                  options={(subjects ?? []).map((s: { id: string; name: string }) => ({ value: s.name, label: s.name }))}
                  placeholder="Select subject"
                />
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Exam date</Label>
                  <Input
                    type="date"
                    value={row.exam_date}
                    onChange={(e) => updateRow(index, 'exam_date', e.target.value)}
                    className="border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Max marks</Label>
                  <Input
                    type="number"
                    value={row.max_marks}
                    onChange={(e) => updateRow(index, 'max_marks', e.target.value)}
                    className="border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700">Passing marks</Label>
                  <Input
                    type="number"
                    value={row.passing_marks}
                    onChange={(e) => updateRow(index, 'passing_marks', e.target.value)}
                    className="border-slate-200 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </DataSection>
    </div>
  );
}
