'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  activateAcademicYear,
  deleteAcademicYear,
} from '@/lib/api/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

interface AY {
  id: string;
  school_id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const EMPTY = { label: '', start_date: '', end_date: '' };

export default function AcademicYearsPage() {
  const qc = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) ?? '';

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AY | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState<AY | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => getAcademicYears({ limit: 50 }),
  });
  const items: AY[] = data?.data ?? [];

  const set = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (ay: AY) => {
    setEditing(ay);
    setForm({ label: ay.label, start_date: ay.start_date, end_date: ay.end_date });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateAcademicYear(editing.id, form)
        : createAcademicYear({ ...form, school_id: schoolId }),
    onSuccess: () => {
      toast.success(editing ? 'Academic year updated' : 'Academic year created');
      qc.invalidateQueries({ queryKey: ['academic-years'] });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to save');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateAcademicYear(id),
    onSuccess: () => {
      toast.success('Active year updated');
      qc.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: () => toast.error('Failed to activate'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAcademicYear(id),
    onSuccess: () => {
      toast.success('Academic year deleted');
      qc.invalidateQueries({ queryKey: ['academic-years'] });
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Cannot delete — it may have class sections attached');
    },
  });

  const submit = () => {
    if (!form.label.trim()) { toast.error('Label is required'); return; }
    if (!form.start_date) { toast.error('Start date is required'); return; }
    if (!form.end_date) { toast.error('End date is required'); return; }
    if (form.end_date <= form.start_date) { toast.error('End date must be after start date'); return; }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Academic Years</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create and manage academic years. One year must be active at all times.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>+ New Academic Year</Button>
      </div>

      {/* Info banner if no AYs */}
      {!isLoading && items.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <strong>Setup required:</strong> Create at least one academic year before adding class sections or students.
        </div>
      )}

      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Label</th>
              <th className="px-4 py-3 text-left font-semibold">Start Date</th>
              <th className="px-4 py-3 text-left font-semibold">End Date</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((ay) => (
                  <tr key={ay.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{ay.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ay.start_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ay.end_date}</td>
                    <td className="px-4 py-3">
                      {ay.is_active
                        ? <Badge>Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!ay.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activateMutation.mutate(ay.id)}
                            disabled={activateMutation.isPending}
                          >
                            Set Active
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(ay)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleting(ay)}
                          disabled={ay.is_active}
                          title={ay.is_active ? 'Cannot delete the active year' : 'Delete'}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No academic years yet — create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Academic Year' : 'New Academic Year'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Label <span className="text-destructive">*</span></Label>
              <Input
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                placeholder="e.g. 2026-27"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => set('start_date', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => set('end_date', e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Academic Year?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete <strong>{deleting?.label}</strong>? This cannot be undone. It will fail if class sections exist in this year.
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
