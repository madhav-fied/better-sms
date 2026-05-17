'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegistrations, updateRegistrationStatus, createRegistration } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
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
import Link from 'next/link';
import { toast } from 'sonner';

const REG_STATUSES = ['pending', 'accepted', 'rejected'] as const;
type RegStatus = typeof REG_STATUSES[number];

const STATUS_STYLES: Record<RegStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const SELECT =
  'w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent ' +
  'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring h-10';

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground tracking-wide">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</p>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

const FORM_INIT = {
  first_name: '',
  last_name: '',
  gender: 'male',
  dob: '',
  blood_group: '',
  aadhar_no: '',
  guardian_name: '',
  guardian_relation: 'father',
  guardian_phone: '',
};
type FormState = typeof FORM_INIT;

export default function RegistrationsPage() {
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_INIT);

  const { data, isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => getRegistrations({ limit: 100 }),
  });
  const items = data?.data ?? [];

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const fstr = (k: keyof FormState) => form[k] as string;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateRegistrationStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Status updated');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to update status');
    },
    onSettled: () => setUpdatingId(null),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const studentFields: Record<string, unknown> = {
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        gender: form.gender,
        dob: form.dob || undefined,
        blood_group: form.blood_group || undefined,
        aadhar_no: form.aadhar_no || undefined,
      };
      const guardians = form.guardian_name
        ? [{
            relation: form.guardian_relation,
            first_name: form.guardian_name,
            name: form.guardian_name,
            phone: form.guardian_phone || undefined,
          }]
        : undefined;
      return createRegistration({ student_fields: studentFields, parent_guardians: guardians });
    },
    onSuccess: () => {
      toast.success('Registration added');
      qc.invalidateQueries({ queryKey: ['registrations'] });
      setOpen(false);
      setForm(FORM_INIT);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to add registration');
    },
  });

  const submitForm = () => {
    if (!form.first_name.trim()) { toast.error('First name is required'); return; }
    createMutation.mutate();
  };

  const handleStatusChange = (id: string, status: string) => {
    setUpdatingId(id);
    statusMutation.mutate({ id, status });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admissions — Registrations</h1>
        <Button size="sm" onClick={() => { setForm(FORM_INIT); setOpen(true); }}>
          + Add Registration
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Student Name</th>
              <th className="px-4 py-3 text-left font-semibold">Submitted</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={3} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((r: { id: string; student_fields?: { first_name?: string; last_name?: string }; submitted_at: string; status: string }) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admissions/registrations/${r.id}`} className="text-primary hover:underline font-medium">
                        {[r.student_fields?.first_name, r.student_fields?.last_name].filter(Boolean).join(' ') || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.submitted_at?.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(evt) => handleStatusChange(r.id, evt.target.value)}
                        className={`text-xs font-medium rounded-full border px-2 py-0.5 cursor-pointer outline-none transition-opacity disabled:opacity-50 ${STATUS_STYLES[r.status as RegStatus] ?? 'bg-muted text-muted-foreground border-border'}`}
                      >
                        {REG_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No registrations found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Registration modal ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="px-8 pt-6 pb-5 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold">Add Registration</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Only First Name is required. Guardian details are optional.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <Section title="Student Details">
              <div className="grid grid-cols-2 gap-4">
                <F label="First Name" required>
                  <Input
                    className="h-10"
                    value={fstr('first_name')}
                    onChange={(e) => set('first_name', e.target.value)}
                    placeholder="First name"
                  />
                </F>
                <F label="Last Name">
                  <Input
                    className="h-10"
                    value={fstr('last_name')}
                    onChange={(e) => set('last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </F>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Gender">
                  <select
                    className={SELECT}
                    value={fstr('gender')}
                    onChange={(e) => set('gender', e.target.value)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </F>
                <F label="Date of Birth">
                  <Input
                    type="date"
                    className="h-10"
                    value={fstr('dob')}
                    onChange={(e) => set('dob', e.target.value)}
                  />
                </F>
                <F label="Blood Group">
                  <select
                    className={SELECT}
                    value={fstr('blood_group')}
                    onChange={(e) => set('blood_group', e.target.value)}
                  >
                    <option value="">— select —</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </F>
              </div>
              <F label="Aadhar No">
                <Input
                  className="h-10 max-w-xs"
                  value={fstr('aadhar_no')}
                  onChange={(e) => set('aadhar_no', e.target.value)}
                  placeholder="12-digit Aadhar number"
                />
              </F>
            </Section>

            <Section title="Parent / Guardian (optional)">
              <div className="grid grid-cols-3 gap-4">
                <F label="Guardian Name">
                  <Input
                    className="h-10"
                    value={fstr('guardian_name')}
                    onChange={(e) => set('guardian_name', e.target.value)}
                    placeholder="Full name"
                  />
                </F>
                <F label="Relation">
                  <select
                    className={SELECT}
                    value={fstr('guardian_relation')}
                    onChange={(e) => set('guardian_relation', e.target.value)}
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="guardian">Guardian</option>
                  </select>
                </F>
                <F label="Phone">
                  <Input
                    className="h-10"
                    value={fstr('guardian_phone')}
                    onChange={(e) => set('guardian_phone', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </F>
              </div>
            </Section>
          </div>

          <DialogFooter className="shrink-0 px-8 py-4 border-t">
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => { setOpen(false); setForm(FORM_INIT); }}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding…' : 'Add Registration'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
