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
import { getSchool } from '@/lib/api/schools';
import { getStudent } from '@/lib/api/students';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEffect, useState, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';
import { useRole } from '@/hooks/useRole';
import { useAuthStore } from '@/store/auth';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const { is } = useRole();
  const readOnly = is('parent', 'student');
  const canEdit = is('admin', 'superadmin', 'teacher');
  const schoolId = useAuthStore((s) => s.schoolId);
  const entityId = useAuthStore((s) => s.entityId);

  const [classSectionId, setClassSectionId] = useState('');
  const [slotMap, setSlotMap] = useState<Record<string, TimetableSlot>>({});
  const qc = useQueryClient();

  const { data: schoolData } = useQuery({
    queryKey: ['school-settings', schoolId],
    queryFn: () => getSchool(schoolId!),
    enabled: !!schoolId,
  });
  const usesSaturday = schoolData?.data?.uses_saturday ?? true;
  const days = useMemo(() => (usesSaturday ? ALL_DAYS : ALL_DAYS.slice(0, 5)), [usesSaturday]);

  const { data: studentData } = useQuery({
    queryKey: ['timetable-student', entityId],
    queryFn: () => getStudent(entityId!),
    enabled: readOnly && !!entityId,
  });

  useEffect(() => {
    if (studentData?.data?.class_section_id && !classSectionId) {
      setClassSectionId(studentData.data.class_section_id);
    }
  }, [studentData?.data?.class_section_id, classSectionId]);

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
    enabled: canEdit,
  });
  const { data: staffResp } = useQuery({
    queryKey: ['staff-teachers'],
    queryFn: () => apiClient.get('/staff', { params: { category: 'teacher', limit: 50 } }).then((r) => r.data?.data ?? []),
    enabled: canEdit,
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
  const currentTimetable = readOnly
    ? timetableRecords.find((t) => t.status === 'published') ?? timetableRecords[0]
    : timetableRecords[0];

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
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description={
          readOnly
            ? 'View the published class timetable.'
            : 'Build and publish weekly timetables for each class section.'
        }
        actions={
          currentTimetable ? (
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${
                currentTimetable.status === 'published'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {currentTimetable.status}
            </span>
          ) : null
        }
      />

      {canEdit && !hasPeriodConfig && !loadingPeriods && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-sm text-amber-800">No period structure configured yet. Set up periods before creating class timetables.</p>
          <Button size="sm" className="mt-3" onClick={() => setupPeriodsMutation.mutate()} disabled={setupPeriodsMutation.isPending}>
            Setup default periods
          </Button>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <LabeledSelect
          label="Class section"
          value={classSectionId}
          onChange={(e) => setClassSectionId(e.target.value)}
          options={sections.map((c) => ({ value: c.id, label: `${c.class_name} ${c.section}` }))}
          placeholder="Select class"
          className="max-w-sm"
        />
      </section>

      {classSectionId && hasPeriodConfig && (
        <DataSection title="Weekly schedule">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Period</th>
                  {days.map((d) => (
                    <th key={d} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingPeriods || loadingTimetable
                  ? Array(6)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i}>
                          <td colSpan={days.length + 1} className="px-4 py-3">
                            <Skeleton className="h-4" />
                          </td>
                        </tr>
                      ))
                  : periodList.map((p) => {
                      const isBreak = p.period_type !== 'regular';
                      return (
                        <tr key={p.period_number} className={isBreak ? 'bg-slate-50' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-600">
                            {p.label}
                            <div className="text-[10px] text-slate-400">
                              {p.start_time}–{p.end_time}
                            </div>
                          </td>
                          {days.map((_, di) => {
                            const day = di + 1;
                            const slot = getSlot(day, p.period_number);
                            if (isBreak) {
                              return (
                                <td key={di} className="px-2 py-2 text-center text-slate-400">
                                  —
                                </td>
                              );
                            }
                            if (readOnly) {
                              const teacher = teachers.find((t) => t.id === slot?.teacher_staff_id);
                              return (
                                <td key={di} className="px-2 py-2">
                                  <div className="font-medium text-slate-800">{slot?.subject ?? '—'}</div>
                                  {teacher && <div className="text-[10px] text-slate-500">{teacher.name}</div>}
                                </td>
                              );
                            }
                            return (
                              <td key={di} className="space-y-1 px-2 py-2">
                                <select
                                  className="w-full rounded-lg border border-slate-200 px-1 py-1 text-xs"
                                  value={slot?.subject ?? ''}
                                  onChange={(e) => updateSlot(day, p.period_number, 'subject', e.target.value)}
                                >
                                  <option value="">Subject</option>
                                  {subjects.map((s) => (
                                    <option key={s.id} value={s.name}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  className="w-full rounded-lg border border-slate-200 px-1 py-1 text-xs"
                                  value={slot?.teacher_staff_id ?? ''}
                                  onChange={(e) => updateSlot(day, p.period_number, 'teacher_staff_id', e.target.value)}
                                >
                                  <option value="">Teacher</option>
                                  {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
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
          </div>
          {canEdit && (
            <div className="flex gap-2 border-t border-slate-200 p-6">
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                Save timetable
              </Button>
              {currentTimetable && currentTimetable.status !== 'published' && (
                <Button size="sm" variant="outline" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                  Publish
                </Button>
              )}
            </div>
          )}
        </DataSection>
      )}

      {readOnly && classSectionId && currentTimetable?.status !== 'published' && !loadingTimetable && (
        <p className="text-sm text-slate-500">The timetable for this class has not been published yet.</p>
      )}
    </div>
  );
}
