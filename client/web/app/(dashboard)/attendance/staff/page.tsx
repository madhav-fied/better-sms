'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { markStaffAttendance } from '@/lib/api/attendance';
import { getStaff } from '@/lib/api/staff';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Staff } from '@/types/staff';

export default function StaffAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, string>>({});

  const { data } = useQuery({ queryKey: ['staff-list'], queryFn: () => getStaff({ limit: 100 }) });
  const staff: Staff[] = data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      markStaffAttendance({
        date,
        records: staff.map((s) => ({ staff_id: s.id, status: records[s.id] ?? 'absent' })),
      }),
    onSuccess: () => toast.success('Staff attendance saved'),
    onError: () => toast.error('Failed to save'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Staff Attendance</h1>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Date</label>
        <input type="date" className="border rounded px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {staff.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Staff</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{s.role}</td>
                  <td className="px-4 py-3">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={records[s.id] ?? 'present'}
                      onChange={(e) => setRecords((r) => ({ ...r, [s.id]: e.target.value }))}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="leave">On Leave</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Submit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
