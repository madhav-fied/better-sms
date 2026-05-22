'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { markStudentAttendance } from '@/lib/api/attendance';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ClassSectionPicker } from '@/components/shared/ClassSectionPicker';
import { useAuthStore } from '@/store/auth';

interface StudentRow { id: string; name: string }

export default function StudentAttendancePage() {
  const role = useAuthStore((s) => s.role);
  const [classSectionId, setClassSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, 'present' | 'absent' | 'leave'>>({});

  const { data: studentsData } = useQuery({
    queryKey: ['attendance-students', classSectionId],
    queryFn: () => apiClient.get('/students', { params: { class_section_id: classSectionId } }).then((r) => r.data?.data ?? []),
    enabled: !!classSectionId,
  });

  const students: StudentRow[] = studentsData ?? [];

  const toggleAll = (status: 'present' | 'absent') => {
    const next: Record<string, 'present' | 'absent'> = {};
    students.forEach((s) => { next[s.id] = status; });
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mark Student Attendance</h1>
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Class</label>
          <ClassSectionPicker
            value={classSectionId}
            onChange={(id) => { setClassSectionId(id); setRecords({}); }}
            className="w-56"
            classTeacherOnly={role === 'teacher'}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Date</label>
          <input type="date" className="border rounded px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {students.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toggleAll('present')}>All Present</Button>
            <Button variant="outline" size="sm" onClick={() => toggleAll('absent')}>All Absent</Button>
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={records[s.id] ?? ''}
                      onChange={(e) => setRecords((r) => ({ ...r, [s.id]: e.target.value as 'present' | 'absent' | 'leave' }))}
                    >
                      <option value="">—</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Submit Attendance'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
