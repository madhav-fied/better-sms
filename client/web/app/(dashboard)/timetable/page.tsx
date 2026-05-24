'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPeriodConfig,
  getTimetable,
  saveTimetable,
  updateTimetable,
  updatePeriodConfig,
  publishTimetable,
  type PeriodConfigItem,
  type TimetableSlot,
} from '@/lib/api/timetable';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_PERIODS: PeriodConfigItem[] = [
  { period_number: 1, label: 'Period 1', start_time: '08:00', end_time: '08:45', period_type: 'regular' },
  { period_number: 2, label: 'Period 2', start_time: '08:45', end_time: '09:30', period_type: 'regular' },
  { period_number: 3, label: 'Recess', start_time: '09:30', end_time: '09:45', period_type: 'break' },
  { period_number: 4, label: 'Period 3', start_time: '09:45', end_time: '10:30', period_type: 'regular' },
  { period_number: 5, label: 'Period 4', start_time: '10:30', end_time: '11:15', period_type: 'regular' },
  { period_number: 6, label: 'Lunch', start_time: '12:30', end_time: '13:00', period_type: 'break' },
];

type ClassSection = { id: string; class_name: string; section: string; academic_year_id: string };
type Subject = { id: string; name: string };
type Staff = { id: string; name: string; category: string };
type TimetableRecord = { id: string; slots?: TimetableSlot[]; status: string };

function slotKey(day: number, period: number) {
  return `${day}-${period}`;
}

export default function TimetablePage() {
  const [classSectionId, setClassSectionId] = useState('');
  const [slotMap, setSlotMap] = useState<Record<string, TimetableSlot>>({});
  const qc = useQueryClient();

  const { data: periodConfigResp, isLoading: loadingPeriods } = useQuery({
    queryKey: ['period-config'],
    queryFn: getPeriodConfig,
  });
  const { data: sectionsResp } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });
  const { data: subjectsResp } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient.get('/subjects').then((r) => r.data?.data ?? []),
  });
  const { data: staffResp } = useQuery({
    queryKey: ['staff-teachers'],
    queryFn: () => apiClient.get('/staff', { params: { category: 'teacher', limit: 50 } }).then((r) => r.data?.data ?? []),
  });
  const { data: timetableResp, isLoading: loadingTimetable } = useQuery({
    queryKey: ['timetable', classSectionId],
    queryFn: () => getTimetable({ class_section_id: classSectionId }),
    enabled: !!classSectionId,
  });

  const periodList: PeriodConfigItem[] = periodConfigResp?.data?.periods ?? [];
  const sections: ClassSection[] = sectionsResp ?? [];
  const subjects: Subject[] = subjectsResp ?? [];
  const teachers: Staff[] = (staffResp ?? []).filter((s: Staff) => s.category === 'teacher');
  const selectedSection = sections.find((s) => s.id === classSectionId);
  const timetableRecords: TimetableRecord[] = timetableResp?.data ?? [];
  const currentTimetable = timetableRecords[0];

  useEffect(() => {
    const slots = currentTimetable?.slots ?? [];
    const next: Record<string, TimetableSlot> = {};
    if (Array.isArray(slots)) {
      for (const slot of slots) {
        next[slotKey(slot.day_of_week, slot.period_number)] = slot;
      }
    }
    setSlotMap(next);
  }, [currentTimetable?.id, classSectionId]);

  const setupPeriodsMutation = useMutation({
    mutationFn: () => updatePeriodConfig(DEFAULT_PERIODS),
    onSuccess: () => {
      toast.success('Period structure created');
      qc.invalidateQueries({ queryKey: ['period-config'] });
    },
    onError: () => toast.error('Failed to create period structure'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSection) throw new Error('No class selected');
      const slots = Object.values(slotMap).filter((s) => s.subject || s.teacher_staff_id);
      if (currentTimetable) {
        return updateTimetable(currentTimetable.id, { slots });
      }
      return saveTimetable({
        class_section_id: classSectionId,
        academic_year_id: selectedSection.academic_year_id,
        slots,
      });
    },
    onSuccess: () => {
      toast.success('Timetable saved');
      qc.invalidateQueries({ queryKey: ['timetable'] });
    },
    onError: () => toast.error('Save failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishTimetable(currentTimetable!.id),
    onSuccess: () => {
      toast.success('Timetable published');
      qc.invalidateQueries({ queryKey: ['timetable'] });
    },
    onError: () => toast.error('Publish failed'),
  });

  const updateSlot = (day: number, period: number, field: 'subject' | 'teacher_staff_id', value: string) => {
    const key = slotKey(day, period);
    setSlotMap((prev) => {
      const existing = prev[key] ?? { day_of_week: day, period_number: period };
      if (field === 'subject') {
        return { ...prev, [key]: { ...existing, subject: value || undefined } };
      }
      return { ...prev, [key]: { ...existing, teacher_staff_id: value || undefined } };
    });
  };

  const getSlot = (day: number, period: number) => slotMap[slotKey(day, period)];

  const hasPeriodConfig = periodList.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Timetable</h1>
        {currentTimetable && (
          <span className={`text-xs px-2 py-1 rounded ${currentTimetable.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {currentTimetable.status}
          </span>
        )}
      </div>

      {!hasPeriodConfig && !loadingPeriods && (
        <div className="rounded-lg border bg-amber-50 p-4 text-sm">
          <p className="text-amber-800 mb-3">No period structure configured yet. Set up periods before creating class timetables.</p>
          <Button size="sm" onClick={() => setupPeriodsMutation.mutate()} disabled={setupPeriodsMutation.isPending}>
            Setup Default Periods
          </Button>
        </div>
      )}

      <select
        className="border rounded px-3 py-2 text-sm"
        value={classSectionId}
        onChange={(e) => setClassSectionId(e.target.value)}
      >
        <option value="">— select class —</option>
        {sections.map((c) => (
          <option key={c.id} value={c.id}>{c.class_name} {c.section}</option>
        ))}
      </select>

      {classSectionId && hasPeriodConfig && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500">Period</th>
                {DAYS.map((d) => <th key={d} className="px-3 py-2 text-gray-500">{d}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingPeriods || loadingTimetable
                ? Array(6).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-3 py-2"><Skeleton className="h-4" /></td></tr>
                  ))
                : periodList.map((p) => {
                    const isBreak = p.period_type !== 'regular';
                    return (
                      <tr key={p.period_number} className={isBreak ? 'bg-gray-50' : ''}>
                        <td className="px-3 py-2 text-gray-500 font-medium">
                          {p.label}
                          <div className="text-[10px] text-gray-400">{p.start_time}–{p.end_time}</div>
                        </td>
                        {DAYS.map((_, di) => {
                          const day = di + 1;
                          const slot = getSlot(day, p.period_number);
                          if (isBreak) {
                            return <td key={di} className="px-2 py-1.5 text-center text-gray-400">—</td>;
                          }
                          return (
                            <td key={di} className="px-2 py-1.5 space-y-1">
                              <select
                                className="border rounded px-1 py-1 text-xs w-full"
                                value={slot?.subject ?? ''}
                                onChange={(e) => updateSlot(day, p.period_number, 'subject', e.target.value)}
                              >
                                <option value="">Subject</option>
                                {subjects.map((s) => (
                                  <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                              </select>
                              <select
                                className="border rounded px-1 py-1 text-xs w-full"
                                value={slot?.teacher_staff_id ?? ''}
                                onChange={(e) => updateSlot(day, p.period_number, 'teacher_staff_id', e.target.value)}
                              >
                                <option value="">Teacher</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          <div className="p-3 border-t flex gap-2">
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save Timetable
            </Button>
            {currentTimetable && currentTimetable.status !== 'published' && (
              <Button size="sm" variant="outline" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                Publish
              </Button>
            )}
          </div>
        </div>
      )}

      {classSectionId && !hasPeriodConfig && !loadingPeriods && (
        <p className="text-sm text-gray-500">Configure period structure above to edit the timetable grid.</p>
      )}

      {!classSectionId && hasPeriodConfig && (
        <p className="text-sm text-gray-500">Select a class section to view or edit its timetable.</p>
      )}
    </div>
  );
}
