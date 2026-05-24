'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { markStaffAttendance } from '@/lib/api/attendance';
import { getStaff } from '@/lib/api/staff';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Staff } from '@/types/staff';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    <div className="space-y-6">
      <PageHeader title="Staff attendance" description="Record daily attendance for all staff members." />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="staff-date" className="text-slate-700">
            Date
          </Label>
          <input
            id="staff-date"
            type="date"
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </section>

      {staff.length > 0 && (
        <DataSection title="Staff members">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Staff
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Role
                </TableHead>
                <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id} className="border-slate-200">
                  <TableCell className="px-6 py-4 font-medium text-slate-900">{s.name}</TableCell>
                  <TableCell className="px-6 py-4 capitalize text-slate-600">{s.role}</TableCell>
                  <TableCell className="px-6 py-4">
                    <select
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={records[s.id] ?? 'present'}
                      onChange={(e) => setRecords((r) => ({ ...r, [s.id]: e.target.value }))}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="leave">On leave</option>
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
