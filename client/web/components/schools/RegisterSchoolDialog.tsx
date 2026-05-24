'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardSchool } from '@/lib/api/schools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const FORM_INIT = {
  name: '',
  branch_name: '',
  address: '',
  phone: '',
  email: '',
  admin_phone: '',
  attendance_mode: 'period',
  uses_saturday: false,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterSchoolDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(FORM_INIT);

  const set = (k: keyof typeof FORM_INIT, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () =>
      onboardSchool({
        name: form.name.trim(),
        branch_name: form.branch_name.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        admin_phone: form.admin_phone.trim(),
        attendance_mode: form.attendance_mode,
        uses_saturday: form.uses_saturday,
      }),
    onSuccess: () => {
      toast.success(`${form.name} registered successfully`);
      qc.invalidateQueries({ queryKey: ['schools'] });
      onOpenChange(false);
      setForm(FORM_INIT);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.detail ?? 'Failed to register school');
    },
  });

  const submit = () => {
    if (!form.name.trim()) { toast.error('School name is required'); return; }
    if (!form.admin_phone.trim()) { toast.error('Admin phone is required'); return; }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!mutation.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Register School</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2">
          {/* Left column — school details */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School details</p>

            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Springfield High School"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Branch name</Label>
              <Input
                value={form.branch_name}
                onChange={(e) => set('branch_name', e.target.value)}
                placeholder="e.g. Main Campus"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Street, City, State"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="contact@school.edu"
              />
            </div>
          </div>

          {/* Right column — admin & settings */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin &amp; settings</p>

            <div className="space-y-1.5">
              <Label>Admin phone <span className="text-destructive">*</span></Label>
              <Input
                type="tel"
                value={form.admin_phone}
                onChange={(e) => set('admin_phone', e.target.value)}
                placeholder="+91 99999 00000"
              />
              <p className="text-xs text-slate-500">
                A school admin account will be created with this phone number.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Attendance mode</Label>
              <select
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                value={form.attendance_mode}
                onChange={(e) => set('attendance_mode', e.target.value)}
              >
                <option value="period">Period-wise</option>
                <option value="subject">Subject-wise</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                id="uses_saturday"
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={form.uses_saturday}
                onChange={(e) => set('uses_saturday', e.target.checked)}
              />
              <Label htmlFor="uses_saturday" className="cursor-pointer font-normal">
                School operates on Saturdays
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Registering…' : 'Register school'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
