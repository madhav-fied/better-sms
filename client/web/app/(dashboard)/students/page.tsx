'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, createStudent } from '@/lib/api/students';
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
import { Student } from '@/types/student';
import { ClassSectionPicker } from '@/components/shared/ClassSectionPicker';

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

const SELECT =
  'w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent ' +
  'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring h-10 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const FILTER_SELECT =
  'w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-transparent ' +
  'focus:outline-none focus:ring-2 focus:ring-ring/50 h-8';

function F({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground tracking-wide">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/70 leading-tight">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          {title}
        </p>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

function TArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none leading-relaxed"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal tabs
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Personal', 'Academic', 'Address', 'Prev. School', 'Other'] as const;
type Tab = typeof TABS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Filter state
// ─────────────────────────────────────────────────────────────────────────────

const FILTER_INIT = {
  search: '',
  admission_no: '',
  mobile: '',
  class_section_id: '',
  gender: '',
  status: '',
  student_type: '',
  admission_type: '',
  fee_type: '',
  hosteller: '',
  tc_generated: '',
  dob_from: '',
  dob_to: '',
};
type Filters = typeof FILTER_INIT;

// ─────────────────────────────────────────────────────────────────────────────
// Add-student form state
// ─────────────────────────────────────────────────────────────────────────────

const FORM_INIT = {
  first_name: '', last_name: '', gender: 'male', dob: '', email: '',
  sms_mobile: '', whatsapp_mobile: '', blood_group: '', aadhar_no: '',
  saral_id: '', apaar_id: '', pen: '',
  class_section_id: '', reg_no: '', roll_number: '', card_number: '',
  cbse_reg_no: '', ledger_no: '', papers: '', additional_papers: '',
  registration_date: '', joining_date: '', relieving_date: '', class_promoted_date: '',
  contact_address: '', pin_code: '', permanent_address: '', country: '', city_state: '',
  last_school_name: '', last_school_class: '', last_school_subjects: '',
  last_school_attendance: '', transfer_certificate_no: '',
  student_type: 'new', admission_type: 'regular', fee_type: '',
  caste_category: '', student_category: '', house_category: '',
  hosteller: false, has_sibling: false, fee_concession: '',
};
type FormState = typeof FORM_INIT;

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const qc = useQueryClient();

  // filters
  const [filters, setFilters] = useState<Filters>(FILTER_INIT);
  const [applied, setApplied] = useState<Filters>(FILTER_INIT);
  const [showMore, setShowMore] = useState(false);

  // modal
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('Personal');
  const [form, setForm] = useState<FormState>(FORM_INIT);

  // build API params from applied filters (drop empty values)
  const apiParams = Object.fromEntries(
    Object.entries(applied).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );

  const { data, isLoading } = useQuery({
    queryKey: ['students', applied],
    queryFn: () => getStudents({ ...apiParams, limit: 50 }),
  });
  const students: Student[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;

  // helpers
  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((p) => ({ ...p, [k]: v }));
  const setFm = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const fstr = (k: keyof FormState) => form[k] as string;

  const applyFilters = useCallback(() => setApplied({ ...filters }), [filters]);
  const resetFilters = () => { setFilters(FILTER_INIT); setApplied(FILTER_INIT); };

  // active filter chip labels
  const activeChips = Object.entries(applied)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => ({ key: k, label: `${k.replace(/_/g, ' ')}: ${v}` }));

  const removeChip = (key: string) => {
    const next = { ...applied, [key]: '' };
    setApplied(next);
    setFilters(next);
  };

  // add student mutation
  const mutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      toast.success('Student added successfully');
      qc.invalidateQueries({ queryKey: ['students'] });
      setOpen(false);
      setForm(FORM_INIT);
      setTab('Personal');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to add student');
    },
  });

  const submitForm = () => {
    if (!form.first_name.trim()) { toast.error('First name is required'); setTab('Personal'); return; }
    if (!form.gender) { toast.error('Gender is required'); setTab('Personal'); return; }
    mutation.mutate({
      first_name: form.first_name,
      last_name: form.last_name || undefined,
      gender: form.gender,
      class_section_id: form.class_section_id || undefined,
      dob: form.dob || undefined,
      email: form.email || undefined,
      sms_mobile: form.sms_mobile || undefined,
      whatsapp_mobile: form.whatsapp_mobile || undefined,
      blood_group: form.blood_group || undefined,
      aadhar_no: form.aadhar_no || undefined,
      saral_id: form.saral_id || undefined,
      apaar_id: form.apaar_id || undefined,
      pen: form.pen || undefined,
      reg_no: form.reg_no || undefined,
      roll_number: form.roll_number || undefined,
      card_number: form.card_number || undefined,
      cbse_reg_no: form.cbse_reg_no || undefined,
      ledger_no: form.ledger_no || undefined,
      papers: form.papers ? form.papers.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      additional_papers: form.additional_papers
        ? form.additional_papers.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      registration_date: form.registration_date || undefined,
      joining_date: form.joining_date || undefined,
      relieving_date: form.relieving_date || undefined,
      class_promoted_date: form.class_promoted_date || undefined,
      contact_address: form.contact_address || undefined,
      pin_code: form.pin_code || undefined,
      permanent_address: form.permanent_address || undefined,
      country: form.country || undefined,
      city_state: form.city_state || undefined,
      last_school_name: form.last_school_name || undefined,
      last_school_class: form.last_school_class || undefined,
      last_school_subjects: form.last_school_subjects || undefined,
      last_school_attendance: form.last_school_attendance
        ? Number(form.last_school_attendance)
        : undefined,
      transfer_certificate_no: form.transfer_certificate_no || undefined,
      student_type: form.student_type,
      admission_type: form.admission_type,
      fee_type: form.fee_type || undefined,
      caste_category: form.caste_category || undefined,
      student_category: form.student_category || undefined,
      house_category: form.house_category || undefined,
      hosteller: form.hosteller,
      has_sibling: form.has_sibling,
      fee_concession: form.fee_concession || undefined,
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{total} record{total !== 1 ? 's' : ''} found</p>
          )}
        </div>
        <Button size="sm" onClick={() => { setOpen(true); setTab('Personal'); }}>
          + Add Student
        </Button>
      </div>

      {/* ── Filter panel ── */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        {/* Primary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by name or admission number…"
              value={filters.search}
              onChange={(e) => setF('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <ClassSectionPicker
            compact
            value={filters.class_section_id}
            onChange={(id) => setF('class_section_id', id)}
            placeholder="All Classes"
          />
          <select
            className={FILTER_SELECT}
            value={filters.status}
            onChange={(e) => setF('status', e.target.value)}
          >
            <option value="">Any Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Expanded row */}
        {showMore && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <Input
              placeholder="Admission No"
              value={filters.admission_no}
              onChange={(e) => setF('admission_no', e.target.value)}
            />
            <Input
              placeholder="Mobile"
              value={filters.mobile}
              onChange={(e) => setF('mobile', e.target.value)}
            />
            <select
              className={FILTER_SELECT}
              value={filters.gender}
              onChange={(e) => setF('gender', e.target.value)}
            >
              <option value="">Any Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <select
              className={FILTER_SELECT}
              value={filters.student_type}
              onChange={(e) => setF('student_type', e.target.value)}
            >
              <option value="">Any Type</option>
              <option value="new">New</option>
              <option value="old">Old</option>
            </select>
            <select
              className={FILTER_SELECT}
              value={filters.admission_type}
              onChange={(e) => setF('admission_type', e.target.value)}
            >
              <option value="">Any Admission</option>
              <option value="regular">Regular</option>
              <option value="daycare">Daycare</option>
              <option value="boarding">Boarding</option>
              <option value="both">Both</option>
            </select>
            <select
              className={FILTER_SELECT}
              value={filters.fee_type}
              onChange={(e) => setF('fee_type', e.target.value)}
            >
              <option value="">Any Fee Type</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half Yearly</option>
              <option value="annually">Annually</option>
            </select>
            <select
              className={FILTER_SELECT}
              value={filters.hosteller}
              onChange={(e) => setF('hosteller', e.target.value)}
            >
              <option value="">Hosteller: Any</option>
              <option value="true">Hosteller: Yes</option>
              <option value="false">Hosteller: No</option>
            </select>
            <select
              className={FILTER_SELECT}
              value={filters.tc_generated}
              onChange={(e) => setF('tc_generated', e.target.value)}
            >
              <option value="">TC: Any</option>
              <option value="true">TC: Generated</option>
              <option value="false">TC: Not Generated</option>
            </select>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">DOB From</span>
              <Input
                type="date"
                value={filters.dob_from}
                onChange={(e) => setF('dob_from', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">DOB To</span>
              <Input
                type="date"
                value={filters.dob_to}
                onChange={(e) => setF('dob_to', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMore((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {showMore ? '▲ Fewer filters' : '▼ More filters'}
          </button>
          <div className="flex gap-2">
            {activeChips.length > 0 && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear all
              </Button>
            )}
            <Button size="sm" onClick={applyFilters}>
              Search
            </Button>
          </div>
        </div>

        {/* Active filter chips */}
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

      {/* ── Table ── */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Adm No</th>
              <th className="px-4 py-3 text-left font-semibold">Class</th>
              <th className="px-4 py-3 text-left font-semibold">Gender</th>
              <th className="px-4 py-3 text-left font-semibold">Mobile</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array(6).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              : students.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${s.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {s.first_name} {s.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.admission_no}</td>
                    <td className="px-4 py-3">{s.class_name ? `${s.class_name} ${s.section}` : '—'}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{s.gender}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.sms_mobile ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{s.student_type ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
            {!isLoading && students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No students match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          Add Student modal
      ──────────────────────────────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[96vw] sm:max-w-[1200px] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <DialogHeader className="px-8 pt-6 pb-5 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold">Add Student</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Only First Name and Gender are required. Class Section and Academic Year can be assigned later.
            </p>
          </DialogHeader>

          {/* Tab bar */}
          <div className="flex border-b bg-muted/20 shrink-0 overflow-x-auto">
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`
                  relative px-7 py-3 text-sm font-medium shrink-0 transition-colors
                  ${tab === t
                    ? 'text-primary bg-background border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }
                `}
              >
                <span className="inline-flex items-center gap-2">
                  <span className={`
                    inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold
                    ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  `}>
                    {i + 1}
                  </span>
                  {t}
                </span>
              </button>
            ))}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">

            {/* ── PERSONAL ── */}
            {tab === 'Personal' && (
              <>
                <Section title="Basic Identity">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="First Name" required>
                      <Input
                        className="h-10"
                        value={fstr('first_name')}
                        onChange={(e) => setFm('first_name', e.target.value)}
                        placeholder="First name"
                      />
                    </F>
                    <F label="Last Name">
                      <Input
                        className="h-10"
                        value={fstr('last_name')}
                        onChange={(e) => setFm('last_name', e.target.value)}
                        placeholder="Last name"
                      />
                    </F>
                    <F label="Gender" required>
                      <select
                        className={SELECT}
                        value={fstr('gender')}
                        onChange={(e) => setFm('gender', e.target.value)}
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
                        onChange={(e) => setFm('dob', e.target.value)}
                      />
                    </F>
                  </div>
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Blood Group">
                      <select
                        className={SELECT}
                        value={fstr('blood_group')}
                        onChange={(e) => setFm('blood_group', e.target.value)}
                      >
                        <option value="">— select —</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </F>
                    <F label="SMS Mobile">
                      <Input
                        className="h-10"
                        value={fstr('sms_mobile')}
                        onChange={(e) => setFm('sms_mobile', e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </F>
                    <F label="WhatsApp Mobile">
                      <Input
                        className="h-10"
                        value={fstr('whatsapp_mobile')}
                        onChange={(e) => setFm('whatsapp_mobile', e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </F>
                    <F label="Email">
                      <Input
                        type="email"
                        className="h-10"
                        value={fstr('email')}
                        onChange={(e) => setFm('email', e.target.value)}
                        placeholder="student@example.com"
                      />
                    </F>
                  </div>
                </Section>

                <Section title="Government IDs">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Aadhar No">
                      <Input
                        className="h-10"
                        value={fstr('aadhar_no')}
                        onChange={(e) => setFm('aadhar_no', e.target.value)}
                        placeholder="12-digit Aadhar number"
                      />
                    </F>
                    <F label="Saral ID">
                      <Input
                        className="h-10"
                        value={fstr('saral_id')}
                        onChange={(e) => setFm('saral_id', e.target.value)}
                      />
                    </F>
                    <F label="APAAR ID">
                      <Input
                        className="h-10"
                        value={fstr('apaar_id')}
                        onChange={(e) => setFm('apaar_id', e.target.value)}
                      />
                    </F>
                    <F label="PEN" hint="Permanent Education Number">
                      <Input
                        className="h-10"
                        value={fstr('pen')}
                        onChange={(e) => setFm('pen', e.target.value)}
                      />
                    </F>
                  </div>
                </Section>
              </>
            )}

            {/* ── ACADEMIC ── */}
            {tab === 'Academic' && (
              <>
                <Section title="Class Placement">
                  <div className="grid grid-cols-4 gap-5">
                    <div className="col-span-2">
                      <F label="Class Section">
                        <ClassSectionPicker
                          value={fstr('class_section_id')}
                          onChange={(id) => setFm('class_section_id', id)}
                          placeholder="— select class section —"
                        />
                      </F>
                    </div>
                    <F label="Roll Number">
                      <Input
                        className="h-10"
                        value={fstr('roll_number')}
                        onChange={(e) => setFm('roll_number', e.target.value)}
                      />
                    </F>
                    <F label="Registration Number">
                      <Input
                        className="h-10"
                        value={fstr('reg_no')}
                        onChange={(e) => setFm('reg_no', e.target.value)}
                      />
                    </F>
                  </div>
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Papers" hint="Comma-separated subject names">
                      <Input
                        className="h-10"
                        value={fstr('papers')}
                        onChange={(e) => setFm('papers', e.target.value)}
                        placeholder="Maths, Science, English"
                      />
                    </F>
                    <F label="Additional Papers" hint="Comma-separated">
                      <Input
                        className="h-10"
                        value={fstr('additional_papers')}
                        onChange={(e) => setFm('additional_papers', e.target.value)}
                        placeholder="Sanskrit, Fine Arts"
                      />
                    </F>
                  </div>
                </Section>

                <Section title="ID Numbers">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Admission Number">
                      <Input className="h-10 opacity-50" disabled placeholder="Auto-generated" />
                    </F>
                    <F label="Card Number">
                      <Input
                        className="h-10"
                        value={fstr('card_number')}
                        onChange={(e) => setFm('card_number', e.target.value)}
                      />
                    </F>
                    <F label="CBSE Registration No">
                      <Input
                        className="h-10"
                        value={fstr('cbse_reg_no')}
                        onChange={(e) => setFm('cbse_reg_no', e.target.value)}
                      />
                    </F>
                    <F label="Ledger No" hint="Also used as CBSE Enrollment No">
                      <Input
                        className="h-10"
                        value={fstr('ledger_no')}
                        onChange={(e) => setFm('ledger_no', e.target.value)}
                      />
                    </F>
                  </div>
                </Section>

                <Section title="Key Dates">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Registration Date">
                      <Input
                        type="date"
                        className="h-10"
                        value={fstr('registration_date')}
                        onChange={(e) => setFm('registration_date', e.target.value)}
                      />
                    </F>
                    <F label="Joining Date">
                      <Input
                        type="date"
                        className="h-10"
                        value={fstr('joining_date')}
                        onChange={(e) => setFm('joining_date', e.target.value)}
                      />
                    </F>
                    <F label="Relieving Date">
                      <Input
                        type="date"
                        className="h-10"
                        value={fstr('relieving_date')}
                        onChange={(e) => setFm('relieving_date', e.target.value)}
                      />
                    </F>
                    <F label="Class Promoted Date">
                      <Input
                        type="date"
                        className="h-10"
                        value={fstr('class_promoted_date')}
                        onChange={(e) => setFm('class_promoted_date', e.target.value)}
                      />
                    </F>
                  </div>
                </Section>
              </>
            )}

            {/* ── ADDRESS ── */}
            {tab === 'Address' && (
              <Section title="Address Details">
                <div className="grid grid-cols-2 gap-6">
                  <F label="Contact Address">
                    <TArea
                      rows={4}
                      value={fstr('contact_address')}
                      onChange={(v) => setFm('contact_address', v)}
                      placeholder="Current / correspondence address"
                    />
                  </F>
                  <F label="Permanent Address">
                    <TArea
                      rows={4}
                      value={fstr('permanent_address')}
                      onChange={(v) => setFm('permanent_address', v)}
                      placeholder="Permanent / hometown address"
                    />
                  </F>
                </div>
                <div className="grid grid-cols-4 gap-5">
                  <F label="Pin Code">
                    <Input
                      className="h-10"
                      value={fstr('pin_code')}
                      onChange={(e) => setFm('pin_code', e.target.value)}
                      placeholder="6-digit PIN"
                    />
                  </F>
                  <div className="col-span-2">
                    <F label="City / State">
                      <Input
                        className="h-10"
                        value={fstr('city_state')}
                        onChange={(e) => setFm('city_state', e.target.value)}
                        placeholder="Mumbai, Maharashtra"
                      />
                    </F>
                  </div>
                  <F label="Country">
                    <Input
                      className="h-10"
                      value={fstr('country')}
                      onChange={(e) => setFm('country', e.target.value)}
                      placeholder="India"
                    />
                  </F>
                </div>
              </Section>
            )}

            {/* ── PREV SCHOOL ── */}
            {tab === 'Prev. School' && (
              <Section title="Previous School Details">
                <div className="grid grid-cols-2 gap-5">
                  <F label="Last School Name">
                    <Input
                      className="h-10"
                      value={fstr('last_school_name')}
                      onChange={(e) => setFm('last_school_name', e.target.value)}
                      placeholder="Name of previous school"
                    />
                  </F>
                  <F label="Last School Class">
                    <Input
                      className="h-10"
                      value={fstr('last_school_class')}
                      onChange={(e) => setFm('last_school_class', e.target.value)}
                      placeholder="e.g. Class 9 / Grade 9"
                    />
                  </F>
                </div>
                <F label="Last School Subjects" hint="Comma-separated list of subjects studied">
                  <Input
                    className="h-10"
                    value={fstr('last_school_subjects')}
                    onChange={(e) => setFm('last_school_subjects', e.target.value)}
                    placeholder="Maths, Science, English, Hindi…"
                  />
                </F>
                <div className="grid grid-cols-4 gap-5">
                  <F label="Last School Attendance" hint="Number of days attended">
                    <Input
                      type="number"
                      min="0"
                      className="h-10"
                      value={fstr('last_school_attendance')}
                      onChange={(e) => setFm('last_school_attendance', e.target.value)}
                      placeholder="e.g. 220"
                    />
                  </F>
                  <div className="col-span-2">
                    <F label="Transfer Certificate No">
                      <Input
                        className="h-10"
                        value={fstr('transfer_certificate_no')}
                        onChange={(e) => setFm('transfer_certificate_no', e.target.value)}
                      />
                    </F>
                  </div>
                </div>
              </Section>
            )}

            {/* ── OTHER ── */}
            {tab === 'Other' && (
              <>
                <Section title="Admission Details">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Student Admission Type">
                      <select
                        className={SELECT}
                        value={fstr('student_type')}
                        onChange={(e) => setFm('student_type', e.target.value)}
                      >
                        <option value="new">New Student</option>
                        <option value="old">Old Student</option>
                      </select>
                    </F>
                    <F label="Admission Type">
                      <select
                        className={SELECT}
                        value={fstr('admission_type')}
                        onChange={(e) => setFm('admission_type', e.target.value)}
                      >
                        <option value="regular">Regular</option>
                        <option value="daycare">Daycare</option>
                        <option value="boarding">Boarding</option>
                        <option value="both">Both</option>
                      </select>
                    </F>
                    <F label="Fee Type">
                      <select
                        className={SELECT}
                        value={fstr('fee_type')}
                        onChange={(e) => setFm('fee_type', e.target.value)}
                      >
                        <option value="">— select —</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="half_yearly">Half Yearly</option>
                        <option value="annually">Annually</option>
                      </select>
                    </F>
                    <F label="Student Fee Concession">
                      <Input
                        className="h-10"
                        value={fstr('fee_concession')}
                        onChange={(e) => setFm('fee_concession', e.target.value)}
                        placeholder="e.g. 50%, Staff ward"
                      />
                    </F>
                  </div>
                </Section>

                <Section title="Category">
                  <div className="grid grid-cols-3 gap-5">
                    <F label="Student Cast Category">
                      <Input
                        className="h-10"
                        value={fstr('caste_category')}
                        onChange={(e) => setFm('caste_category', e.target.value)}
                        placeholder="e.g. General, OBC, SC, ST"
                      />
                    </F>
                    <F label="Student Category">
                      <Input
                        className="h-10"
                        value={fstr('student_category')}
                        onChange={(e) => setFm('student_category', e.target.value)}
                      />
                    </F>
                    <F label="House Category">
                      <Input
                        className="h-10"
                        value={fstr('house_category')}
                        onChange={(e) => setFm('house_category', e.target.value)}
                        placeholder="e.g. Red House, Blue House"
                      />
                    </F>
                  </div>
                </Section>

                <Section title="Other Flags">
                  <div className="flex flex-wrap gap-8">
                    <label className="flex items-center gap-3 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={form.hosteller}
                        onChange={(e) => setFm('hosteller', e.target.checked)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <span className="text-sm group-hover:text-foreground text-muted-foreground transition-colors">
                        Is Hosteler Student
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={form.has_sibling}
                        onChange={(e) => setFm('has_sibling', e.target.checked)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <span className="text-sm group-hover:text-foreground text-muted-foreground transition-colors">
                        Create Student Sibling
                      </span>
                    </label>
                  </div>
                </Section>
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0 px-8 border-t">
            <div className="flex items-center justify-between w-full py-1">
              {/* Tab progress dots */}
              <div className="flex items-center gap-2">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    title={t}
                    className={`rounded-full transition-all duration-200 ${
                      tab === t ? 'w-8 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-2">
                  {TABS.indexOf(tab) + 1} / {TABS.length}
                </span>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-3">
                {tab !== 'Personal' && (
                  <Button
                    variant="outline"
                    onClick={() => setTab(TABS[TABS.indexOf(tab) - 1])}
                  >
                    ← Back
                  </Button>
                )}
                {tab !== 'Other' ? (
                  <Button onClick={() => setTab(TABS[TABS.indexOf(tab) + 1])}>
                    Next →
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => { setOpen(false); setForm(FORM_INIT); }}
                      disabled={mutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button onClick={submitForm} disabled={mutation.isPending}>
                      {mutation.isPending ? 'Adding…' : 'Add Student'}
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
