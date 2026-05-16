'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import { onboardSchool, type OnboardSchoolPayload } from '@/lib/api/schools';
import { useRole } from '@/hooks/useRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const EMPTY_FORM: OnboardSchoolPayload = {
  name: '',
  branch_name: '',
  address: '',
  phone: '',
  email: '',
  attendance_mode: 'period',
  uses_saturday: false,
  admin_phone: '',
};

export default function SchoolsPage() {
  const { is } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OnboardSchoolPayload>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: () => apiClient.get('/schools').then((r) => r.data?.data ?? []),
  });
  const schools = data ?? [];

  const mutation = useMutation({
    mutationFn: onboardSchool,
    onSuccess: (res) => {
      const { school, admin_user } = res.data;
      qc.invalidateQueries({ queryKey: ['schools'] });
      setOpen(false);
      setForm(EMPTY_FORM);
      toast.success(
        `School created. Share with the admin:\nSchool ID: ${school.id}\nAdmin phone: ${admin_user.phone}`,
        { duration: 10000 }
      );
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to create school');
    },
  });

  const set = (field: keyof OnboardSchoolPayload, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = () => {
    if (!form.name.trim()) { toast.error('School name is required'); return; }
    if (!form.admin_phone.trim()) { toast.error('Admin phone is required'); return; }
    const payload: OnboardSchoolPayload = {
      ...form,
      branch_name: form.branch_name || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Schools</h1>
        {is('superadmin') && (
          <Button size="sm" onClick={() => setOpen(true)}>New School</Button>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : schools.map((s: { id: string; name: string; branch_name?: string; is_active: boolean }) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.branch_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* ── New School Dialog ───────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Onboard New School</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>School Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="St. Mary's School" />
            </div>
            <div className="space-y-1">
              <Label>Branch Name</Label>
              <Input value={form.branch_name} onChange={(e) => set('branch_name', e.target.value)} placeholder="Main Campus" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="123 School St" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Contact Phone</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91..." />
              </div>
              <div className="space-y-1">
                <Label>Contact Email</Label>
                <Input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="school@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Attendance Mode</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={form.attendance_mode}
                  onChange={(e) => set('attendance_mode', e.target.value)}
                >
                  <option value="period">Period</option>
                  <option value="session">Session</option>
                </select>
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={form.uses_saturday}
                    onChange={(e) => set('uses_saturday', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Uses Saturday
                </label>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1">
              <Label>Admin Phone <span className="text-red-500">*</span></Label>
              <Input
                value={form.admin_phone}
                onChange={(e) => set('admin_phone', e.target.value)}
                placeholder="+91XXXXXXXXXX"
              />
              <p className="text-xs text-gray-400">The first admin's mobile — they'll use this to log in via OTP</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
