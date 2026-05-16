'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { bulkSaveResults, publishResults } from '@/lib/api/results';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ResultsPage() {
  const [examId, setExamId] = useState('');
  const [classSectionId, setClassSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [publishOpen, setPublishOpen] = useState(false);

  const { data: exams } = useQuery({ queryKey: ['exams'], queryFn: () => apiClient.get('/exams').then((r) => r.data?.data ?? []) });
  const { data: sections } = useQuery({ queryKey: ['class-sections'], queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []) });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: () => apiClient.get('/subjects').then((r) => r.data?.data ?? []) });

  const { data: studentsData } = useQuery({
    queryKey: ['result-students', classSectionId],
    queryFn: () => apiClient.get('/students', { params: { class_section_id: classSectionId } }).then((r) => r.data?.data ?? []),
    enabled: !!classSectionId,
  });
  const students: { id: string; name: string }[] = studentsData ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      bulkSaveResults(
        students.map((s) => ({ student_id: s.id, exam_id: examId, subject_id: subjectId, marks_obtained: Number(marks[s.id] ?? 0) }))
      ),
    onSuccess: () => toast.success('Draft saved'),
    onError: () => toast.error('Save failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishResults({ exam_id: examId, class_section_id: classSectionId, subject_id: subjectId }),
    onSuccess: () => { toast.success('Results published'); setPublishOpen(false); },
    onError: () => toast.error('Publish failed'),
  });

  const ready = !!examId && !!classSectionId && !!subjectId;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Results Entry</h1>
      <div className="flex gap-3 flex-wrap">
        <select className="border rounded px-3 py-2 text-sm" value={examId} onChange={(e) => setExamId(e.target.value)}>
          <option value="">— Exam —</option>
          {(exams ?? []).map((e: { id: string; name: string }) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="border rounded px-3 py-2 text-sm" value={classSectionId} onChange={(e) => setClassSectionId(e.target.value)}>
          <option value="">— Class —</option>
          {(sections ?? []).map((c: { id: string; class_name: string; section: string }) => <option key={c.id} value={c.id}>{c.class_name} {c.section}</option>)}
        </select>
        <select className="border rounded px-3 py-2 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">— Subject —</option>
          {(subjects ?? []).map((s: { id: string; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {students.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Marks Obtained</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      className="w-24 h-8 text-sm"
                      value={marks[s.id] ?? ''}
                      onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t flex gap-2">
            <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save Draft
            </Button>
            <Button onClick={() => setPublishOpen(true)} disabled={!ready}>
              Publish
            </Button>
          </div>
        </div>
      )}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publish Results</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">
            Published results will be visible to students and parents. Proceed?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? 'Publishing…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
