'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPeriodConfig, updatePeriodConfig, getTimetable, saveTimetable, updateTimetable } from '@/lib/api/timetable';
import { getStaff } from '@/lib/api/staff';
import { getClassSections } from '@/lib/api/core';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { ClassSectionPicker } from '@/components/shared/ClassSectionPicker';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type PeriodRow = { name: string; start_time: string; end_time: string };
type SlotState = { subject_id: string; teacher_id: string };
type SlotsMap = Record<string, SlotState>;

const EMPTY_PERIOD: PeriodRow = { name: '', start_time: '', end_time: '' };

export default function TimetablePage() {
  const [classSectionId, setClassSectionId] = useState('');
  const [slots, setSlots] = useState<SlotsMap>({});
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editPeriods, setEditPeriods] = useState<PeriodRow[]>([]);
  const qc = useQueryClient();

  const { data: periodConfigData, isLoading: loadingPeriods } = useQuery({
    queryKey: ['period-config'],
    queryFn: getPeriodConfig,
  });
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient.get('/subjects').then((r) => r.data?.data ?? []),
  });
  const { data: staffData } = useQuery({
    queryKey: ['staff', 'all'],
    queryFn: () => getStaff({ limit: 200 }),
  });
  const { data: classData } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => getClassSections({ limit: 200 }),
  });
  const { data: timetableData } = useQuery({
    queryKey: ['timetable', classSectionId],
    queryFn: () => getTimetable({ class_section_id: classSectionId }),
    enabled: !!classSectionId,
  });

  const rawPeriods = periodConfigData?.data?.periods;
  const periodList: Array<{ period_number: number; name: string; start_time: string; end_time: string }> =
    Array.isArray(rawPeriods) ? rawPeriods : [];

  const subjects: Array<{ id: string; name: string }> = subjectsData ?? [];
  const staffList: Array<{ id: string; first_name: string; last_name: string }> = staffData?.data ?? [];
  const sections: Array<{ id: string; academic_year_id: string }> = classData?.data ?? [];
  const timetables: Array<{ id: string; class_section_id: string; slots: unknown }> = timetableData?.data ?? [];
  const existingTimetable = timetables.find((t) => t.class_section_id === classSectionId) ?? null;
  const selectedSection = sections.find((s) => s.id === classSectionId);

  useEffect(() => {
    const rawSlots = Array.isArray((existingTimetable as { slots?: unknown })?.slots)
      ? (existingTimetable as { slots: Array<{ day_of_week: number; period_number: number; subject_id?: string; teacher_id?: string }> }).slots
      : [];
    const map: SlotsMap = {};
    for (const s of rawSlots) {
      map[`${s.day_of_week}_${s.period_number}`] = {
        subject_id: s.subject_id ?? '',
        teacher_id: s.teacher_id ?? '',
      };
    }
    setSlots(map);
  }, [classSectionId, timetableData]);

  const openPeriodDialog = () => {
    setEditPeriods(
      periodList.length > 0
        ? periodList.map((p) => ({ name: p.name, start_time: p.start_time ?? '', end_time: p.end_time ?? '' }))
        : [{ ...EMPTY_PERIOD }]
    );
    setPeriodDialogOpen(true);
  };

  const updateEditPeriod = (i: number, field: keyof PeriodRow, val: string) =>
    setEditPeriods((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));

  const periodConfigMutation = useMutation({
    mutationFn: () => {
      const periods = editPeriods
        .filter((p) => p.name.trim())
        .map((p, i) => ({ period_number: i + 1, name: p.name.trim(), start_time: p.start_time, end_time: p.end_time }));
      return updatePeriodConfig({ periods });
    },
    onSuccess: () => {
      toast.success('Period configuration saved');
      qc.invalidateQueries({ queryKey: ['period-config'] });
      setPeriodDialogOpen(false);
    },
    onError: () => toast.error('Failed to save period configuration'),
  });

  const setSlot = (day: number, period: number, field: keyof SlotState, val: string) => {
    const key = `${day}_${period}`;
    setSlots((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { subject_id: '', teacher_id: '' }), [field]: val },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const slotsArray = Object.entries(slots)
        .filter(([, v]) => v.subject_id)
        .map(([key, v]) => {
          const [day, period] = key.split('_').map(Number);
          return { day_of_week: day, period_number: period, ...v };
        });
      if (existingTimetable) {
        return updateTimetable(existingTimetable.id, { slots: slotsArray });
      }
      return saveTimetable({
        class_section_id: classSectionId,
        academic_year_id: selectedSection?.academic_year_id ?? '',
        slots: slotsArray,
      });
    },
    onSuccess: () => {
      toast.success('Timetable saved');
      qc.invalidateQueries({ queryKey: ['timetable'] });
    },
    onError: () => toast.error('Save failed'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Timetable</h1>
        <Button variant="outline" size="sm" onClick={openPeriodDialog} disabled={loadingPeriods}>
          {loadingPeriods ? 'Loading…' : periodList.length === 0 ? 'Configure Periods' : `Edit Periods (${periodList.length})`}
        </Button>
      </div>

      {!loadingPeriods && periodList.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          No periods configured yet. Click <strong>Configure Periods</strong> to define period timings before editing timetables.
        </p>
      )}

      <ClassSectionPicker value={classSectionId} onChange={setClassSectionId} className="w-56" />

      {classSectionId && periodList.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500">Period</th>
                  {DAYS.map((d) => <th key={d} className="px-3 py-2 text-gray-500">{d}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingPeriods
                  ? Array(6).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-3 py-2"><Skeleton className="h-8" /></td></tr>
                    ))
                  : periodList.map((p) => (
                      <tr key={p.period_number}>
                        <td className="px-3 py-2 text-gray-500 font-medium whitespace-nowrap">
                          <div>{p.name}</div>
                          {p.start_time && (
                            <div className="text-[10px] text-gray-400">{p.start_time}–{p.end_time}</div>
                          )}
                        </td>
                        {DAYS.map((_, di) => {
                          const key = `${di + 1}_${p.period_number}`;
                          const slot = slots[key] ?? { subject_id: '', teacher_id: '' };
                          return (
                            <td key={di} className="px-2 py-1.5 space-y-1">
                              <select
                                className="border rounded px-2 py-1 text-xs w-28 block"
                                value={slot.subject_id}
                                onChange={(e) => setSlot(di + 1, p.period_number, 'subject_id', e.target.value)}
                              >
                                <option value="">— subject —</option>
                                {subjects.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <select
                                className="border rounded px-2 py-1 text-xs w-28 block"
                                value={slot.teacher_id}
                                onChange={(e) => setSlot(di + 1, p.period_number, 'teacher_id', e.target.value)}
                              >
                                <option value="">— teacher —</option>
                                {staffList.map((t) => (
                                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save Timetable'}
          </Button>
        </>
      )}

      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Periods</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 px-1">
              <span>Name</span><span>Start</span><span>End</span><span />
            </div>
            {editPeriods.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <Input
                  className="h-8 text-xs"
                  placeholder={`Period ${i + 1}`}
                  value={p.name}
                  onChange={(e) => updateEditPeriod(i, 'name', e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  type="time"
                  value={p.start_time}
                  onChange={(e) => updateEditPeriod(i, 'start_time', e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  type="time"
                  value={p.end_time}
                  onChange={(e) => updateEditPeriod(i, 'end_time', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setEditPeriods((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-500 text-sm leading-none px-1"
                >
                  ×
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditPeriods((prev) => [...prev, { ...EMPTY_PERIOD }])}
            >
              + Add Period
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)} disabled={periodConfigMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => periodConfigMutation.mutate()} disabled={periodConfigMutation.isPending}>
              {periodConfigMutation.isPending ? 'Saving…' : 'Save Periods'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
