'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { markStudentAttendance } from '@/lib/api/attendance';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ClassSection {
  id: string;
  class_name: string;
  section: string;
}
interface StudentRow {
  id: string;
  name: string;
}

export default function StudentAttendancePage() {
  const [classSectionId, setClassSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, 'present' | 'absent' | 'leave'>>({});

  const { data: sections } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['attendance-students', classSectionId],
    queryFn: () => apiClient.get('/students', { params: { class_section_id: classSectionId } }).then((r) => r.data?.data ?? []),
    enabled: !!classSectionId,
  });

  const students: StudentRow[] = studentsData ?? [];

  const toggleAll = (status: 'present' | 'absent') => {
    const next: Record<string, 'present' | 'absent'> = {};
    students.forEach((s) => {
      next[s.id] = status;
    });
    setRecords(next);
  };

  const mutation = useMutation({
    mutationFn: () =>
      markStudentAttendance({
        class_section_id: classSectionId,
        date,
        records: students.map((s) => ({ student_id: s.id, status: records[s.id] ?? 'absent' })),
      }),
    onSuccess: () => toast.success('Attendance saved'),
    onError: () => toast.error('Failed to save attendance'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Mark student attendance" description="Record daily attendance for a class section." />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <LabeledSelect
            label="Class section"
            value={classSectionId}
            onChange={(e) => {
              setClassSectionId(e.target.value);
              setRecords({});
            }}
            options={(sections ?? []).map((c: ClassSection) => ({
              value: c.id,
              label: `${c.class_name} ${c.section}`,
            }))}
            placeholder="Select class"
            className="min-w-[200px]"
          />
          <div className="space-y-1.5">
            <Label htmlFor="att-date" className="text-slate-700">
              Date
            </Label>
            <input
              id="att-date"
              type="date"
              className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {students.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleAll('present')}>
                All present
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll('absent')}>
                All absent
              </Button>
            </div>
          )}
        </div>
      </section>

      {students.length > 0 && (
        <DataSection title="Students">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Student
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id} className="border-slate-200">
                  <TableCell className="px-6 py-4 font-medium text-slate-900">{s.name}</TableCell>
                  <TableCell className="px-6 py-4">
                    <select
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={records[s.id] ?? ''}
                      onChange={(e) =>
                        setRecords((r) => ({ ...r, [s.id]: e.target.value as 'present' | 'absent' | 'leave' }))
                      }
                    >
                      <option value="">Select status</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-slate-200 p-6">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Submit attendance'}
            </Button>
          </div>
        </DataSection>
      )}
    </div>
  );
}
