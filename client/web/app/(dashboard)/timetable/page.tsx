'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPeriodConfig, getTimetable, saveTimetable } from '@/lib/api/timetable';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { ClassSectionPicker } from '@/components/shared/ClassSectionPicker';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TimetablePage() {
  const [classSectionId, setClassSectionId] = useState('');
  const qc = useQueryClient();

  const { data: periods, isLoading: loadingPeriods } = useQuery({
    queryKey: ['period-config'],
    queryFn: getPeriodConfig,
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient.get('/subjects').then((r) => r.data?.data ?? []),
  });
  const { data: timetableData } = useQuery({
    queryKey: ['timetable', classSectionId],
    queryFn: () => getTimetable({ class_section_id: classSectionId }),
    enabled: !!classSectionId,
  });

  const periodList = periods?.data ?? [];
  const timetable = timetableData?.data ?? [];

  const getEntry = (day: number, period: number) =>
    timetable.find((e: { day_of_week: number; period_number: number }) => e.day_of_week === day && e.period_number === period);

  const saveMutation = useMutation({
    mutationFn: (data: unknown) => saveTimetable(data),
    onSuccess: () => { toast.success('Timetable saved'); qc.invalidateQueries({ queryKey: ['timetable'] }); },
    onError: () => toast.error('Save failed'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Timetable</h1>
      <ClassSectionPicker
        value={classSectionId}
        onChange={setClassSectionId}
        className="w-56"
      />

      {classSectionId && (
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
                    <tr key={i}><td colSpan={7} className="px-3 py-2"><Skeleton className="h-4" /></td></tr>
                  ))
                : periodList.map((p: { period_number: number; name: string }) => (
                    <tr key={p.period_number}>
                      <td className="px-3 py-2 text-gray-500 font-medium">{p.name}</td>
                      {DAYS.map((_, di) => {
                        const entry = getEntry(di + 1, p.period_number);
                        return (
                          <td key={di} className="px-2 py-1.5">
                            <select
                              className="border rounded px-2 py-1 text-xs w-28"
                              defaultValue={entry?.subject_id ?? ''}
                            >
                              <option value="">—</option>
                              {(subjects ?? []).map((s: { id: string; name: string }) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
          <div className="p-3 border-t">
            <Button size="sm" onClick={() => saveMutation.mutate({ class_section_id: classSectionId })}>
              Save Timetable
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
