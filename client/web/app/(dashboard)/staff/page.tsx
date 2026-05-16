'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaff, createStaff, upsertJobDetail } from '@/lib/api/staff';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { toast } from 'sonner';
import { Staff } from '@/types/staff';

// ── helpers ────────────────────────────────────────────────────────────────

const sel = 'w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 h-8';

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">{title}</p>
      {children}
    </div>
  );
}

// ── tabs ───────────────────────────────────────────────────────────────────

const TABS = ['Personal', 'Professional', 'Address', 'Family', 'Job Details'] as const;
type Tab = typeof TABS[number];

// ── filter state ───────────────────────────────────────────────────────────

const FILTER_INIT = {
  search: '',
  category: '',
  status: '',
  gender: '',
  teaching_type: '',
  grade: '',
  designation: '',
};
type Filters = typeof FILTER_INIT;

// ── initial form state ─────────────────────────────────────────────────────

const INIT = {
  // Personal
  first_name: '', last_name: '', short_name: '', gender: 'male',
  dob: '', email: '', mobile: '', religion: '', aadhar_no: '',
  blood_group: '', caste_category: '', emergency_mobile: '',
  // Professional
  emp_code: '', category: 'teacher', designation: '', qualification: '',
  teaching_type: '', grade: '', basic_salary: '', total_experience: '',
  card_number: '', relieving_date: '', licensee_number: '', passport_number: '',
  // Address
  contact_address: '', pincode: '', permanent_address: '', city_state: '',
  // Family
  father_first_name: '', father_last_name: '',
  mother_first_name: '', mother_last_name: '',
  marital_status: '', spouse_name: '',
  // Job Details
  joined_date: '', end_of_probation: '', position: '', effective_date: '',
  superior: '', department: '', branch: '', job_type: '', job_status: '',
  workdays: '', holidays: '',
};
type Form = typeof INIT;

export default function StaffPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('Personal');
  const [form, setForm] = useState<Form>(INIT);

  // filters
  const [filters, setFilters] = useState<Filters>(FILTER_INIT);
  const [applied, setApplied] = useState<Filters>(FILTER_INIT);

  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((p) => ({ ...p, [k]: v }));
  const applyFilters = useCallback(() => setApplied({ ...filters }), [filters]);
  const resetFilters = () => { setFilters(FILTER_INIT); setApplied(FILTER_INIT); };

  const apiParams = Object.fromEntries(
    Object.entries(applied).filter(([, v]) => v !== ''),
  );

  const activeChips = Object.entries(applied)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => ({ key: k, label: `${k.replace(/_/g, ' ')}: ${v}` }));

  const removeChip = (key: string) => {
    const next = { ...applied, [key]: '' };
    setApplied(next);
    setFilters(next);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['staff', applied],
    queryFn: () => getStaff({ ...apiParams, limit: 50 }),
  });
  const staff: Staff[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));
  const str = (k: keyof Form) => form[k] as string;

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await createStaff(payload);
      const staffId: string = res?.data?.id ?? res?.data?.staff_id;
      if (staffId) {
        const jd = {
          joined_date: form.joined_date || undefined,
          end_of_probation: form.end_of_probation || undefined,
          position: form.position || undefined,
          effective_date: form.effective_date || undefined,
          superior: form.superior || undefined,
          department: form.department || undefined,
          branch: form.branch || undefined,
          job_type: form.job_type || undefined,
          job_status: form.job_status || undefined,
          workdays: form.workdays ? Number(form.workdays) : undefined,
          holidays: form.holidays ? Number(form.holidays) : undefined,
        };
        const hasJobData = Object.values(jd).some((v) => v !== undefined);
        if (hasJobData) await upsertJobDetail(staffId, jd);
      }
      return res;
    },
    onSuccess: () => {
      toast.success('Staff member added');
      qc.invalidateQueries({ queryKey: ['staff'] });
      setOpen(false);
      setForm(INIT);
      setTab('Personal');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to add staff');
    },
  });

  const submit = () => {
    if (!form.first_name.trim()) { toast.error('First name is required'); setTab('Personal'); return; }
    if (!form.gender) { toast.error('Gender is required'); setTab('Personal'); return; }
    if (!form.category) { toast.error('Category is required'); setTab('Professional'); return; }
    mutation.mutate({
      first_name: form.first_name,
      last_name: form.last_name || undefined,
      short_name: form.short_name || undefined,
      gender: form.gender,
      dob: form.dob || undefined,
      email: form.email || undefined,
      mobile: form.mobile || undefined,
      religion: form.religion || undefined,
      aadhar_no: form.aadhar_no || undefined,
      blood_group: form.blood_group || undefined,
      caste_category: form.caste_category || undefined,
      emergency_mobile: form.emergency_mobile || undefined,
      emp_code: form.emp_code || undefined,
      category: form.category,
      designation: form.designation || undefined,
      qualification: form.qualification || undefined,
      teaching_type: form.teaching_type || undefined,
      grade: form.grade || undefined,
      basic_salary: form.basic_salary ? Number(form.basic_salary) : undefined,
      total_experience: form.total_experience ? Number(form.total_experience) : undefined,
      card_number: form.card_number || undefined,
      relieving_date: form.relieving_date || undefined,
      licensee_number: form.licensee_number || undefined,
      passport_number: form.passport_number || undefined,
      contact_address: form.contact_address || undefined,
      pincode: form.pincode || undefined,
      permanent_address: form.permanent_address || undefined,
      city_state: form.city_state || undefined,
      father_first_name: form.father_first_name || undefined,
      father_last_name: form.father_last_name || undefined,
      mother_first_name: form.mother_first_name || undefined,
      mother_last_name: form.mother_last_name || undefined,
      marital_status: form.marital_status || undefined,
      spouse_name: form.spouse_name || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Staff</h1>
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{total} record{total !== 1 ? 's' : ''} found</p>
          )}
        </div>
        <Button size="sm" onClick={() => { setOpen(true); setTab('Personal'); }}>+ Add Staff</Button>
      </div>

      {/* Filter panel */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search name, emp code, mobile, email…"
              value={filters.search}
              onChange={(e) => setF('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <select
            className={sel}
            value={filters.category}
            onChange={(e) => setF('category', e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="teacher">Teacher</option>
            <option value="peon">Peon</option>
            <option value="accounts">Accounts</option>
            <option value="clerk">Clerk</option>
            <option value="electrician">Electrician</option>
            <option value="receptionist">Receptionist</option>
            <option value="security">Security</option>
            <option value="other">Other</option>
          </select>
          <select
            className={sel}
            value={filters.status}
            onChange={(e) => setF('status', e.target.value)}
          >
            <option value="">Any Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select
            className={sel}
            value={filters.gender}
            onChange={(e) => setF('gender', e.target.value)}
          >
            <option value="">Any Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <select
            className={sel}
            value={filters.teaching_type}
            onChange={(e) => setF('teaching_type', e.target.value)}
          >
            <option value="">Any Teaching Type</option>
            <option value="regular">Regular</option>
            <option value="contract">Contract</option>
            <option value="guest">Guest</option>
            <option value="part_time">Part-time</option>
          </select>
          <Input
            placeholder="Grade (e.g. L1)"
            value={filters.grade}
            onChange={(e) => setF('grade', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
          <Input
            placeholder="Designation"
            value={filters.designation}
            onChange={(e) => setF('designation', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          {activeChips.length > 0 && (
            <Button variant="outline" size="sm" onClick={resetFilters}>Clear all</Button>
          )}
          <Button size="sm" onClick={applyFilters}>Search</Button>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2.5 py-0.5"
              >
                {chip.label}
                <button
                  onClick={() => removeChip(chip.key)}
                  className="hover:text-primary/70 leading-none ml-0.5"
                  aria-label={`Remove ${chip.key} filter`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
              <th className="px-4 py-3 text-left font-semibold">Mobile</th>
              <th className="px-4 py-3 text-left font-semibold">Category</th>
              <th className="px-4 py-3 text-left font-semibold">Designation</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : staff.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/staff/${s.id}`} className="font-medium text-primary hover:underline">
                        {s.first_name} {s.last_name ?? s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.emp_code ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.mobile ?? s.phone ?? '—'}</td>
                    <td className="px-4 py-3 capitalize">{s.category ?? s.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.designation ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status ?? (s.is_active ? 'active' : 'inactive')}</Badge>
                    </td>
                  </tr>
                ))}
            {!isLoading && staff.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No staff match your filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Staff dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] sm:max-w-[1200px] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base">Add Staff Member</DialogTitle>
          </DialogHeader>

          {/* Tab bar */}
          <div className="flex gap-0 border-b bg-muted/30 shrink-0 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-sm font-medium shrink-0 border-b-2 transition-colors ${
                  tab === t
                    ? 'border-primary text-primary bg-background'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── Personal ── */}
            {tab === 'Personal' && (
              <>
                <Section title="Identity">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="First Name" required>
                      <Input value={str('first_name')} onChange={(e) => set('first_name', e.target.value)} placeholder="First name" />
                    </F>
                    <F label="Last Name">
                      <Input value={str('last_name')} onChange={(e) => set('last_name', e.target.value)} placeholder="Last name" />
                    </F>
                    <F label="Short Name">
                      <Input value={str('short_name')} onChange={(e) => set('short_name', e.target.value)} placeholder="e.g. Priya S." />
                    </F>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Gender" required>
                      <select className={sel} value={str('gender')} onChange={(e) => set('gender', e.target.value)}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </F>
                    <F label="Date of Birth">
                      <Input type="date" value={str('dob')} onChange={(e) => set('dob', e.target.value)} />
                    </F>
                    <F label="Religion">
                      <Input value={str('religion')} onChange={(e) => set('religion', e.target.value)} />
                    </F>
                  </div>
                </Section>

                <Section title="Contact">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Email">
                      <Input type="email" value={str('email')} onChange={(e) => set('email', e.target.value)} placeholder="staff@school.com" />
                    </F>
                    <F label="Mobile Number">
                      <Input value={str('mobile')} onChange={(e) => set('mobile', e.target.value)} placeholder="+91 …" />
                    </F>
                    <F label="Emergency Mobile">
                      <Input value={str('emergency_mobile')} onChange={(e) => set('emergency_mobile', e.target.value)} placeholder="+91 …" />
                    </F>
                  </div>
                </Section>

                <Section title="Government IDs & Health">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Aadhar No">
                      <Input value={str('aadhar_no')} onChange={(e) => set('aadhar_no', e.target.value)} placeholder="12-digit Aadhar" />
                    </F>
                    <F label="Blood Group">
                      <select className={sel} value={str('blood_group')} onChange={(e) => set('blood_group', e.target.value)}>
                        <option value="">— select —</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </F>
                    <F label="Caste Category">
                      <Input value={str('caste_category')} onChange={(e) => set('caste_category', e.target.value)} placeholder="e.g. General, OBC" />
                    </F>
                  </div>
                </Section>
              </>
            )}

            {/* ── Professional ── */}
            {tab === 'Professional' && (
              <>
                <Section title="Role & Classification">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Staff Category" required>
                      <select className={sel} value={str('category')} onChange={(e) => set('category', e.target.value)}>
                        {['teacher','peon','accounts','clerk','electrician','receptionist','security','other'].map((c) => (
                          <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                    </F>
                    <F label="Designation">
                      <Input value={str('designation')} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Senior Teacher" />
                    </F>
                    <F label="Staff Grade">
                      <Input value={str('grade')} onChange={(e) => set('grade', e.target.value)} placeholder="e.g. A, B1" />
                    </F>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Select Teaching Type">
                      <select className={sel} value={str('teaching_type')} onChange={(e) => set('teaching_type', e.target.value)}>
                        <option value="">— select —</option>
                        <option value="regular">Regular</option>
                        <option value="contract">Contract</option>
                        <option value="guest">Guest</option>
                        <option value="part_time">Part Time</option>
                      </select>
                    </F>
                    <F label="Qualification">
                      <Input value={str('qualification')} onChange={(e) => set('qualification', e.target.value)} placeholder="e.g. B.Ed, M.Sc" />
                    </F>
                    <F label="Employee Code">
                      <Input value={str('emp_code')} onChange={(e) => set('emp_code', e.target.value)} placeholder="Auto if blank" />
                    </F>
                  </div>
                </Section>

                <Section title="Compensation & Experience">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Basic Salary (₹)">
                      <Input type="number" min="0" value={str('basic_salary')} onChange={(e) => set('basic_salary', e.target.value)} placeholder="0.00" />
                    </F>
                    <F label="Total Experience (months)">
                      <Input type="number" min="0" value={str('total_experience')} onChange={(e) => set('total_experience', e.target.value)} />
                    </F>
                  </div>
                </Section>

                <Section title="Documents">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Card Number">
                      <Input value={str('card_number')} onChange={(e) => set('card_number', e.target.value)} />
                    </F>
                    <F label="Licensee Number">
                      <Input value={str('licensee_number')} onChange={(e) => set('licensee_number', e.target.value)} />
                    </F>
                    <F label="Passport Number">
                      <Input value={str('passport_number')} onChange={(e) => set('passport_number', e.target.value)} />
                    </F>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Relieving Date">
                      <Input type="date" value={str('relieving_date')} onChange={(e) => set('relieving_date', e.target.value)} />
                    </F>
                  </div>
                </Section>
              </>
            )}

            {/* ── Address ── */}
            {tab === 'Address' && (
              <Section title="Address Details">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <F label="Contact Address">
                      <textarea
                        rows={2}
                        className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                        value={str('contact_address')}
                        onChange={(e) => set('contact_address', e.target.value)}
                        placeholder="Current address"
                      />
                    </F>
                  </div>
                  <F label="Pincode">
                    <Input value={str('pincode')} onChange={(e) => set('pincode', e.target.value)} placeholder="6-digit PIN" />
                  </F>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <F label="Permanent Address">
                      <textarea
                        rows={2}
                        className="w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                        value={str('permanent_address')}
                        onChange={(e) => set('permanent_address', e.target.value)}
                        placeholder="Permanent address"
                      />
                    </F>
                  </div>
                  <F label="City / State">
                    <Input value={str('city_state')} onChange={(e) => set('city_state', e.target.value)} placeholder="Mumbai, Maharashtra" />
                  </F>
                </div>
              </Section>
            )}

            {/* ── Family ── */}
            {tab === 'Family' && (
              <>
                <Section title="Father Details">
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Father First Name">
                      <Input value={str('father_first_name')} onChange={(e) => set('father_first_name', e.target.value)} />
                    </F>
                    <F label="Father Last Name">
                      <Input value={str('father_last_name')} onChange={(e) => set('father_last_name', e.target.value)} />
                    </F>
                  </div>
                </Section>

                <Section title="Mother Details">
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Mother First Name">
                      <Input value={str('mother_first_name')} onChange={(e) => set('mother_first_name', e.target.value)} />
                    </F>
                    <F label="Mother Last Name">
                      <Input value={str('mother_last_name')} onChange={(e) => set('mother_last_name', e.target.value)} />
                    </F>
                  </div>
                </Section>

                <Section title="Marital Status">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Select Marital Status">
                      <select className={sel} value={str('marital_status')} onChange={(e) => set('marital_status', e.target.value)}>
                        <option value="">— select —</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </F>
                    <F label="Husband / Wife Name">
                      <Input value={str('spouse_name')} onChange={(e) => set('spouse_name', e.target.value)} />
                    </F>
                  </div>
                </Section>
              </>
            )}

            {/* ── Job Details ── */}
            {tab === 'Job Details' && (
              <>
                <Section title="Employment Timeline">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Joined Date">
                      <Input type="date" value={str('joined_date')} onChange={(e) => set('joined_date', e.target.value)} />
                    </F>
                    <F label="End of Probation">
                      <Input type="date" value={str('end_of_probation')} onChange={(e) => set('end_of_probation', e.target.value)} />
                    </F>
                    <F label="Effective Date">
                      <Input type="date" value={str('effective_date')} onChange={(e) => set('effective_date', e.target.value)} />
                    </F>
                  </div>
                </Section>

                <Section title="Position & Reporting">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Position">
                      <Input value={str('position')} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Class Teacher" />
                    </F>
                    <F label="Superior">
                      <Input value={str('superior')} onChange={(e) => set('superior', e.target.value)} placeholder="Reporting manager name" />
                    </F>
                    <F label="Department">
                      <Input value={str('department')} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Science Dept." />
                    </F>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Branch">
                      <Input value={str('branch')} onChange={(e) => set('branch', e.target.value)} />
                    </F>
                    <F label="Job Type">
                      <select className={sel} value={str('job_type')} onChange={(e) => set('job_type', e.target.value)}>
                        <option value="">— select —</option>
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="probation">Probation</option>
                      </select>
                    </F>
                    <F label="Job Status">
                      <select className={sel} value={str('job_status')} onChange={(e) => set('job_status', e.target.value)}>
                        <option value="">— select —</option>
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="resigned">Resigned</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </F>
                  </div>
                </Section>

                <Section title="Schedule">
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Workdays (per week)">
                      <Input type="number" min="0" max="7" value={str('workdays')} onChange={(e) => set('workdays', e.target.value)} />
                    </F>
                    <F label="Holidays (per year)">
                      <Input type="number" min="0" value={str('holidays')} onChange={(e) => set('holidays', e.target.value)} />
                    </F>
                  </div>
                </Section>
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0">
            <div className="flex items-center gap-2 w-full justify-between">
              <div className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`h-1.5 rounded-full transition-all ${tab === t ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'}`}
                    aria-label={t}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {tab !== 'Personal' && (
                  <Button variant="outline" size="sm" onClick={() => setTab(TABS[TABS.indexOf(tab) - 1])}>Back</Button>
                )}
                {tab !== 'Job Details' ? (
                  <Button size="sm" onClick={() => setTab(TABS[TABS.indexOf(tab) + 1])}>Next</Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setOpen(false); setForm(INIT); }} disabled={mutation.isPending}>Cancel</Button>
                    <Button size="sm" onClick={submit} disabled={mutation.isPending}>
                      {mutation.isPending ? 'Adding…' : 'Add Staff'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
