'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPeriodConfig, updatePeriodConfig, type PeriodConfigItem } from '@/lib/api/timetable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

const DEFAULT_PERIODS: PeriodConfigItem[] = [
  { period_number: 1, label: 'Period 1', start_time: '08:00', end_time: '08:45', period_type: 'regular' },
  { period_number: 2, label: 'Period 2', start_time: '08:45', end_time: '09:30', period_type: 'regular' },
  { period_number: 3, label: 'Recess', start_time: '09:30', end_time: '09:45', period_type: 'break' },
  { period_number: 4, label: 'Period 3', start_time: '09:45', end_time: '10:30', period_type: 'regular' },
  { period_number: 5, label: 'Period 4', start_time: '10:30', end_time: '11:15', period_type: 'regular' },
  { period_number: 6, label: 'Lunch', start_time: '12:30', end_time: '13:00', period_type: 'break' },
];

export default function PeriodSettingsPage() {
  const qc = useQueryClient();
  const [periods, setPeriods] = useState<PeriodConfigItem[]>([]);

  const { data, isLoading } = useQuery({ queryKey: ['period-config'], queryFn: getPeriodConfig });

  useEffect(() => {
    const list = data?.data?.periods;
    if (Array.isArray(list) && list.length > 0) setPeriods(list);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updatePeriodConfig(periods),
    onSuccess: () => {
      toast.success('Bell schedule saved');
      qc.invalidateQueries({ queryKey: ['period-config'] });
    },
    onError: () => toast.error('Failed to save bell schedule'),
  });

  const updatePeriod = (index: number, field: keyof PeriodConfigItem, value: string | number) => {
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const addPeriod = () => {
    const next = periods.length + 1;
    setPeriods((prev) => [...prev, { period_number: next, label: `Period ${next}`, start_time: '09:00', end_time: '09:45', period_type: 'regular' }]);
  };

  const removePeriod = (index: number) => {
    setPeriods((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, period_number: i + 1 })));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bell schedule"
        description="Configure period times and breaks used across all class timetables."
        actions={
          periods.length === 0 ? (
            <Button variant="outline" onClick={() => setPeriods(DEFAULT_PERIODS)}>Load default template</Button>
          ) : null
        }
      />

      <DataSection
        title="Period structure"
        description="Each row is one period or break slot in the daily schedule."
        actions={
          <Button variant="outline" size="sm" onClick={addPeriod}>Add period</Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-600">#</TableHead>
              <TableHead className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-600">Label</TableHead>
              <TableHead className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-600">Start</TableHead>
              <TableHead className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-600">End</TableHead>
              <TableHead className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-600">Type</TableHead>
              <TableHead className="bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p, i) => (
              <TableRow key={i} className="border-slate-200">
                <TableCell className="px-4 py-3 text-slate-600">{p.period_number}</TableCell>
                <TableCell className="px-4 py-3">
                  <Input value={p.label} onChange={(e) => updatePeriod(i, 'label', e.target.value)} className="border-slate-200 h-8" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Input type="time" value={p.start_time} onChange={(e) => updatePeriod(i, 'start_time', e.target.value)} className="border-slate-200 h-8" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Input type="time" value={p.end_time} onChange={(e) => updatePeriod(i, 'end_time', e.target.value)} className="border-slate-200 h-8" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    value={p.period_type}
                    onChange={(e) => updatePeriod(i, 'period_type', e.target.value)}
                  >
                    <option value="regular">Teaching</option>
                    <option value="break">Break</option>
                    <option value="assembly">Assembly</option>
                  </select>
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => removePeriod(i)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-slate-200 px-6 py-4">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || periods.length === 0}>
            {saveMutation.isPending ? 'Saving…' : 'Save bell schedule'}
          </Button>
        </div>
      </DataSection>
    </div>
  );
}
