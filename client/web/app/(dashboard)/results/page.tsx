'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { bulkSaveResults, publishResults, getMarksheet } from '@/lib/api/results';
import apiClient from '@/lib/api/client';
import { getStudents } from '@/lib/api/students';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';
import { useRole } from '@/hooks/useRole';
import { useAuthStore } from '@/store/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function MarksheetView() {
  const { role } = useRole();
  const entityId = useAuthStore((s) => s.entityId);
  const [examId, setExamId] = useState('');
  const [studentId, setStudentId] = useState('');

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => apiClient.get('/exams').then((r) => r.data?.data ?? []),
  });

  const { data: wardsData } = useQuery({
    queryKey: ['result-wards'],
    queryFn: () => getStudents({ limit: 20 }),
    enabled: role === 'parent',
  });
  const wards = wardsData?.data ?? [];

  const effectiveStudentId = role === 'student' ? entityId ?? '' : studentId;

  const { data: marksheetData, isLoading } = useQuery({
    queryKey: ['marksheet', examId, effectiveStudentId],
    queryFn: () => getMarksheet({ exam_id: examId, student_id: effectiveStudentId! }),
    enabled: !!examId && !!effectiveStudentId,
  });
  const marksheet = marksheetData?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My results"
        description="View published marksheets for exams. Only published results are shown."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <LabeledSelect
            label="Exam"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            options={(exams ?? []).map((e: { id: string; name: string }) => ({ value: e.id, label: e.name }))}
            placeholder="Select exam"
          />
          {role === 'parent' && (
            <LabeledSelect
              label="Student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              options={wards.map((w: { id: string; name: string }) => ({ value: w.id, label: w.name }))}
              placeholder="Select student"
            />
          )}
        </div>
      </section>

      {examId && effectiveStudentId && (
        <DataSection title="Marksheet">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !marksheet?.subjects?.length ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">No published results for this exam yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Subject
                    </TableHead>
                    <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Marks
                    </TableHead>
                    <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Max
                    </TableHead>
                    <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marksheet.subjects.map((s: { id: string; subject: string; marks_obtained?: number; max_marks: number; is_absent?: boolean }) => (
                    <TableRow key={s.id} className="border-slate-200">
                      <TableCell className="px-6 py-4 font-medium text-slate-900">{s.subject}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-700">
                        {s.is_absent ? '—' : (s.marks_obtained ?? '—')}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">{s.max_marks}</TableCell>
                      <TableCell className="px-6 py-4 capitalize text-slate-600">
                        {s.is_absent ? 'Absent' : 'Present'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-700">
                <span className="font-medium">Total: </span>
                {marksheet.total_marks_obtained} / {marksheet.total_max_marks}
                <span className="ml-4 font-medium">Percentage: </span>
                {marksheet.percentage}%
              </div>
            </>
          )}
        </DataSection>
      )}
    </div>
  );
}

function ResultsEntryView() {
  const [examId, setExamId] = useState('');
  const [classSectionId, setClassSectionId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [passingMarks, setPassingMarks] = useState('35');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [publishOpen, setPublishOpen] = useState(false);

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => apiClient.get('/exams').then((r) => r.data?.data ?? []),
  });
  const { data: sections } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient.get('/subjects').then((r) => r.data?.data ?? []),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['result-students', classSectionId],
    queryFn: () => apiClient.get('/students', { params: { class_section_id: classSectionId } }).then((r) => r.data?.data ?? []),
    enabled: !!classSectionId,
  });
  const students: { id: string; name: string }[] = studentsData ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      bulkSaveResults({
        results: students.map((s) => ({
          student_id: s.id,
          exam_id: examId,
          class_section_id: classSectionId,
          subject: subjectName,
          marks_obtained: marks[s.id] === '' ? null : Number(marks[s.id] ?? 0),
          max_marks: Number(maxMarks),
          passing_marks: Number(passingMarks),
        })),
      }),
    onSuccess: () => toast.success('Draft saved'),
    onError: () => toast.error('Save failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishResults({ exam_id: examId, class_section_id: classSectionId, subject: subjectName }),
    onSuccess: () => {
      toast.success('Results published');
      setPublishOpen(false);
    },
    onError: () => toast.error('Publish failed'),
  });

  const ready = !!examId && !!classSectionId && !!subjectName;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results entry"
        description="Enter marks by exam, class, and subject. Save drafts before publishing to students and parents."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LabeledSelect
            label="Exam"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            options={(exams ?? []).map((e: { id: string; name: string }) => ({ value: e.id, label: e.name }))}
            placeholder="Select exam"
          />
          <LabeledSelect
            label="Class section"
            value={classSectionId}
            onChange={(e) => setClassSectionId(e.target.value)}
            options={(sections ?? []).map((c: { id: string; class_name: string; section: string }) => ({
              value: c.id,
              label: `${c.class_name} ${c.section}`,
            }))}
            placeholder="Select class"
          />
          <LabeledSelect
            label="Subject"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            options={(subjects ?? []).map((s: { id: string; name: string }) => ({ value: s.name, label: s.name }))}
            placeholder="Select subject"
          />
          <div className="space-y-1.5">
            <Label htmlFor="max-marks" className="text-slate-700">
              Max marks
            </Label>
            <Input
              id="max-marks"
              type="number"
              min={0}
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="passing-marks" className="text-slate-700">
              Passing marks
            </Label>
            <Input
              id="passing-marks"
              type="number"
              min={0}
              value={passingMarks}
              onChange={(e) => setPassingMarks(e.target.value)}
              className="border-slate-200"
            />
          </div>
        </div>
      </section>

      {students.length > 0 && (
        <DataSection title="Student marks">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Student
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Marks obtained
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id} className="border-slate-200">
                  <TableCell className="px-6 py-4 font-medium text-slate-900">{s.name}</TableCell>
                  <TableCell className="px-6 py-4">
                    <Input
                      type="number"
                      min={0}
                      max={Number(maxMarks) || undefined}
                      className="w-28 border-slate-200"
                      value={marks[s.id] ?? ''}
                      onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex gap-2 border-t border-slate-200 p-6">
            <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save draft
            </Button>
            <Button onClick={() => setPublishOpen(true)} disabled={!ready}>
              Publish
            </Button>
          </div>
        </DataSection>
      )}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish results</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Published results will be visible to students and parents. Proceed?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? 'Publishing…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResultsPage() {
  const { role } = useRole();
  if (role === 'parent' || role === 'student') return <MarksheetView />;
  return <ResultsEntryView />;
}
