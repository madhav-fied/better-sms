'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClassSections,
  createClassSection,
  updateClassSection,
  deleteClassSection,
  getAcademicYears,
} from '@/lib/api/core';
import { getStaff } from '@/lib/api/staff';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

interface AY { id: string; label: string; is_active: boolean; }
interface CS {
  id: string; school_id: string; academic_year_id: string;
  class_name: string; section: string; class_teacher_id?: string;
}
interface StaffMember { id: string; first_name: string; last_name?: string; name?: string; category: string; }

const SEL = 'w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 h-9';
const EMPTY_FORM = { academic_year_id: '', class_name: '', section: '', class_teacher_id: '' };

export default function ClassSectionsPage() {
  const qc = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) ?? '';

  const [ayFilter, setAyFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CS | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState<CS | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAY, setBulkAY] = useState('');
  const [bulkClasses, setBulkClasses] = useState('');
  const [bulkSections, setBulkSections] = useState('A');

  const { data: ayData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => getAcademicYears({ limit: 50 }),
  });
  const academicYears: AY[] = ayData?.data ?? [];
  const activeAY = academicYears.find((a) => a.is_active);

  const { data: csData, isLoading } = useQuery({
    queryKey: ['class-sections', ayFilter],
    queryFn: () => getClassSections({ limit: 200, academic_year_id: ayFilter || undefined }),
  });
  const sections: CS[] = csData?.data ?? [];

  const { data: staffData } = useQuery({
    queryKey: ['staff', 'teachers'],
    queryFn: () => getStaff({ category: 'teacher', status: 'active', limit: 200 }),
    enabled: open,
  });
  const teachers: StaffMember[] = staffData?.data ?? [];

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, academic_year_id: activeAY?.id ?? '' });
    setOpen(true);
  };
  const openEdit = (cs: CS) => {
    setEditing(cs);
    setForm({
      academic_year_id: cs.academic_year_id,
      class_name: cs.class_name,
      section: cs.section,
      class_teacher_id: cs.class_teacher_id ?? '',
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateClassSection(editing.id, {
            class_name: form.class_name,
            section: form.section,
            class_teacher_id: form.class_teacher_id || null,
          })
        : createClassSection({
            school_id: schoolId,
            academic_year_id: form.academic_year_id,
            class_name: form.class_name,
            section: form.section,
            class_teacher_id: form.class_teacher_id || undefined,
          }),
    onSuccess: () => {
      toast.success(editing ? 'Class section updated' : 'Class section created');
      qc.invalidateQueries({ queryKey: ['class-sections'] });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to save');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClassSection(id),
    onSuccess: () => {
      toast.success('Class section deleted');
      qc.invalidateQueries({ queryKey: ['class-sections'] });
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Cannot delete — students may be enrolled');
    },
  });

  const submit = () => {
    if (!form.academic_year_id) { toast.error('Academic year is required'); return; }
    if (!form.class_name.trim()) { toast.error('Class name is required'); return; }
    if (!form.section.trim()) { toast.error('Section is required'); return; }
    saveMutation.mutate();
  };

  // Bulk create: e.g. classes="1,2,3,4,5" sections="A,B" → creates 10 entries
  const bulkMutation = useMutation({
    mutationFn: async () => {
      const classNames = bulkClasses.split(',').map((s) => s.trim()).filter(Boolean);
      const sectionNames = bulkSections.split(',').map((s) => s.trim()).filter(Boolean);
      if (!classNames.length || !sectionNames.length) throw new Error('Enter class names and sections');
      const jobs = classNames.flatMap((cls) =>
        sectionNames.map((sec) =>
          createClassSection({
            school_id: schoolId,
            academic_year_id: bulkAY,
            class_name: cls,
            section: sec,
          })
        )
      );
      await Promise.all(jobs);
    },
    onSuccess: () => {
      toast.success('Bulk class sections created');
      qc.invalidateQueries({ queryKey: ['class-sections'] });
      setBulkOpen(false);
      setBulkClasses('');
      setBulkSections('A');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } } & { message?: string };
      toast.error(e.response?.data?.error ?? e.message ?? 'Bulk create failed');
    },
  });

  // Group sections by class_name for display
  const grouped = sections.reduce<Record<string, CS[]>>((acc, cs) => {
    (acc[cs.class_name] = acc[cs.class_name] ?? []).push(cs);
    return acc;
  }, {});

  const ayLabel = (id: string) => academicYears.find((a) => a.id === id)?.label ?? id;
  const teacherName = (id?: string) => {
    if (!id) return '—';
    const t = teachers.find((t) => t.id === id);
    if (!t) return id;
    return t.first_name ? `${t.first_name} ${t.last_name ?? ''}`.trim() : (t.name ?? id);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Class Sections</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage classes and sections for each academic year.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setBulkAY(activeAY?.id ?? ''); setBulkOpen(true); }}>
            Bulk Create
          </Button>
          <Button size="sm" onClick={openCreate}>+ Add Section</Button>
        </div>
      </div>

      {/* Setup banner */}
      {!isLoading && academicYears.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <strong>No academic years found.</strong>{' '}
          <Link href="/settings/academic-years" className="underline font-medium">
            Create an academic year first
          </Link>{' '}
          before adding class sections.
        </div>
      )}

      {/* AY filter */}
      {academicYears.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by year:</span>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setAyFilter('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!ayFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              All
            </button>
            {academicYears.map((ay) => (
              <button
                key={ay.id}
                onClick={() => setAyFilter(ay.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${ayFilter === ay.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {ay.label}
                {ay.is_active && ' ✓'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grouped table */}
      {isLoading ? (
        <div className="space-y-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border bg-white px-6 py-14 text-center">
          <p className="text-muted-foreground">No class sections yet.</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>+ Add First Section</Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Class</th>
                <th className="px-4 py-3 text-left font-semibold">Section</th>
                <th className="px-4 py-3 text-left font-semibold">Academic Year</th>
                <th className="px-4 py-3 text-left font-semibold">Class Teacher</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                .flatMap(([className, rows]) =>
                  rows
                    .sort((a, b) => a.section.localeCompare(b.section))
                    .map((cs, idx) => (
                      <tr key={cs.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {idx === 0 ? className : ''}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{cs.section}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{ayLabel(cs.academic_year_id)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{teacherName(cs.class_teacher_id)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(cs)}>Edit</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleting(cs)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Class Section' : 'New Class Section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Academic Year <span className="text-destructive">*</span></Label>
              {academicYears.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  No academic years found.{' '}
                  <Link href="/settings/academic-years" className="underline">Create one first.</Link>
                </p>
              ) : (
                <select
                  className={SEL}
                  value={form.academic_year_id}
                  onChange={(e) => set('academic_year_id', e.target.value)}
                  disabled={!!editing}
                >
                  <option value="">— select year —</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label}{ay.is_active ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.class_name}
                  onChange={(e) => set('class_name', e.target.value)}
                  placeholder="e.g. Grade 5, Class 10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Section <span className="text-destructive">*</span></Label>
                <Input
                  value={form.section}
                  onChange={(e) => set('section', e.target.value)}
                  placeholder="e.g. A, B, C"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Class Teacher <span className="text-muted-foreground">(optional)</span></Label>
              <select
                className={SEL}
                value={form.class_teacher_id}
                onChange={(e) => set('class_teacher_id', e.target.value)}
              >
                <option value="">— none —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name ? `${t.first_name} ${t.last_name ?? ''}`.trim() : (t.name ?? t.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveMutation.isPending || academicYears.length === 0}>
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk create modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Create Class Sections</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Enter multiple class names and sections — every combination will be created.
          </p>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Academic Year <span className="text-destructive">*</span></Label>
              <select className={SEL} value={bulkAY} onChange={(e) => setBulkAY(e.target.value)}>
                <option value="">— select year —</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>{ay.label}{ay.is_active ? ' (Active)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Class Names <span className="text-destructive">*</span></Label>
              <Input
                value={bulkClasses}
                onChange={(e) => setBulkClasses(e.target.value)}
                placeholder="Grade 1, Grade 2, Grade 3"
              />
              <p className="text-[11px] text-muted-foreground">Comma-separated list of class names</p>
            </div>
            <div className="space-y-1.5">
              <Label>Sections <span className="text-destructive">*</span></Label>
              <Input
                value={bulkSections}
                onChange={(e) => setBulkSections(e.target.value)}
                placeholder="A, B, C"
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated. Every class × every section will be created.
              </p>
            </div>
            {bulkAY && bulkClasses && bulkSections && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Will create{' '}
                <strong>
                  {bulkClasses.split(',').filter((s) => s.trim()).length *
                    bulkSections.split(',').filter((s) => s.trim()).length}
                </strong>{' '}
                class sections.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkMutation.mutate()}
              disabled={bulkMutation.isPending || !bulkAY || !bulkClasses || !bulkSections}
            >
              {bulkMutation.isPending ? 'Creating…' : 'Create All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Class Section?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete <strong>{deleting?.class_name} – {deleting?.section}</strong>?
            This will fail if students are enrolled in this section.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
