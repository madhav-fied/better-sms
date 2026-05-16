'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClassSections, createClassSection, getAcademicYears } from '@/lib/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

interface ClassSection {
  id: string;
  class_name: string;
  section: string;
  academic_year_id: string;
}

interface AY {
  id: string;
  label: string;
  is_active: boolean;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** If true, renders a compact filter-bar style (shorter height) */
  compact?: boolean;
}

const FORM_INIT = { class_name: '', section: '', academic_year_id: '' };

export function ClassSectionPicker({
  value,
  onChange,
  className,
  placeholder = '— select class —',
  disabled,
  compact,
}: Props) {
  const qc = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) ?? '';
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(FORM_INIT);

  const { data: csData } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => getClassSections({ limit: 200 }),
  });
  const sections: ClassSection[] = csData?.data ?? [];

  const { data: ayData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => getAcademicYears({ limit: 50 }),
    enabled: open,
  });
  const years: AY[] = ayData?.data ?? [];
  const activeAY = years.find((y) => y.is_active);

  const set = (k: keyof typeof FORM_INIT, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // auto-fill active AY once data arrives (query only fires when open=true)
  useEffect(() => {
    if (open && activeAY && !form.academic_year_id) {
      setForm((p) => ({ ...p, academic_year_id: activeAY.id }));
    }
  }, [open, activeAY, form.academic_year_id]);

  const openDialog = () => {
    setForm({ ...FORM_INIT, academic_year_id: activeAY?.id ?? '' });
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createClassSection({
        school_id: schoolId,
        academic_year_id: form.academic_year_id,
        class_name: form.class_name.trim(),
        section: form.section.trim(),
      }),
    onSuccess: (res) => {
      toast.success(`${form.class_name} ${form.section} created`);
      qc.invalidateQueries({ queryKey: ['class-sections'] });
      const newId: string = res?.data?.id ?? res?.id ?? '';
      if (newId) onChange(newId);
      setOpen(false);
      setForm(FORM_INIT);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to create class section');
    },
  });

  const submit = () => {
    if (!form.academic_year_id) { toast.error('Select an academic year'); return; }
    if (!form.class_name.trim()) { toast.error('Class name is required'); return; }
    if (!form.section.trim()) { toast.error('Section is required'); return; }
    createMutation.mutate();
  };

  const selectCls = compact
    ? 'flex-1 border border-input rounded-lg px-2.5 py-1.5 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 h-8'
    : 'flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring h-10 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
        <select
          className={selectCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          {sections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.class_name} {c.section}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openDialog}
          disabled={disabled}
          title="Add new class section"
          className={`shrink-0 flex items-center justify-center rounded-lg border border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${compact ? 'h-8 w-8 text-sm' : 'h-10 w-10'}`}
        >
          +
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Class Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Academic Year <span className="text-destructive">*</span></Label>
              <select
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 h-10"
                value={form.academic_year_id}
                onChange={(e) => set('academic_year_id', e.target.value)}
              >
                <option value="">— select —</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}{y.is_active ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
              {years.length === 0 && (
                <p className="text-xs text-amber-600">
                  No academic years found.{' '}
                  <a href="/settings/academic-years" className="underline">Create one first</a>.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.class_name}
                  onChange={(e) => set('class_name', e.target.value)}
                  placeholder="e.g. Grade 5"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Section <span className="text-destructive">*</span></Label>
                <Input
                  value={form.section}
                  onChange={(e) => set('section', e.target.value)}
                  placeholder="e.g. A"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create & Select'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
