'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, createStudent, updateStudent, addParentGuardian, deleteParentGuardian } from '@/lib/api/students';
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
import { Student, ParentGuardian } from '@/types/student';
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

const TABS = ['Personal', 'Academic', 'Address', 'Prev. School', 'Parents', 'Other'] as const;
type Tab = typeof TABS[number];
const EDIT_TABS = ['Personal', 'Academic', 'Address', 'Prev. School', 'Parents', 'Other'] as const;
type EditTab = typeof EDIT_TABS[number];

type ParentForm = {
  relation: 'father' | 'mother' | 'guardian';
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  occupation: string;
  is_primary: boolean;
};
const PARENT_INIT: ParentForm = {
  relation: 'father', first_name: '', last_name: '',
  phone: '', email: '', occupation: '', is_primary: false,
};

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

function studentToForm(s: Student): FormState {
  return {
    first_name: s.first_name ?? '', last_name: s.last_name ?? '', gender: s.gender ?? 'male',
    dob: s.dob ?? '', email: s.email ?? '', sms_mobile: s.sms_mobile ?? '',
    whatsapp_mobile: s.whatsapp_mobile ?? '', blood_group: s.blood_group ?? '',
    aadhar_no: s.aadhar_no ?? '', saral_id: s.saral_id ?? '', apaar_id: s.apaar_id ?? '',
    pen: s.pen ?? '', class_section_id: s.class_section_id ?? '', reg_no: s.reg_no ?? '',
    roll_number: s.roll_number ?? '', card_number: s.card_number ?? '',
    cbse_reg_no: s.cbse_reg_no ?? '', ledger_no: s.ledger_no ?? '',
    papers: (s.papers ?? []).join(', '), additional_papers: (s.additional_papers ?? []).join(', '),
    registration_date: s.registration_date ?? '', joining_date: s.joining_date ?? '',
    relieving_date: s.relieving_date ?? '', class_promoted_date: s.class_promoted_date ?? '',
    contact_address: s.contact_address ?? '', pin_code: s.pin_code ?? '',
    permanent_address: s.permanent_address ?? '', country: s.country ?? '',
    city_state: s.city_state ?? '', last_school_name: s.last_school_name ?? '',
    last_school_class: s.last_school_class ?? '', last_school_subjects: s.last_school_subjects ?? '',
    last_school_attendance: s.last_school_attendance != null ? String(s.last_school_attendance) : '',
    transfer_certificate_no: s.transfer_certificate_no ?? '',
    student_type: s.student_type ?? 'new', admission_type: s.admission_type ?? 'regular',
    fee_type: s.fee_type ?? '', caste_category: s.caste_category ?? '',
    student_category: s.student_category ?? '', house_category: s.house_category ?? '',
    hosteller: s.hosteller ?? false, has_sibling: s.has_sibling ?? false,
    fee_concession: s.fee_concession ?? '',
  };
}

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
  const [parents, setParents] = useState<ParentForm[]>([]);

  // edit modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<FormState>(FORM_INIT);
  const [editTab, setEditTab] = useState<EditTab>('Personal');
  const [editExistingPGs, setEditExistingPGs] = useState<ParentGuardian[]>([]);
  const [editNewPGs, setEditNewPGs] = useState<ParentForm[]>([]);
  const setEFm = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setEditForm((p) => ({ ...p, [k]: v }));
  const efstr = (k: keyof FormState) => editForm[k] as string;

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setEditForm(studentToForm(s));
    setEditTab('Personal');
    setEditExistingPGs(s.parent_guardians ?? []);
    setEditNewPGs([]);
  };

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
      setParents([]);
      setTab('Personal');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to add student');
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingStudent) throw new Error();
      const result = await updateStudent(editingStudent.id, {
        first_name: editForm.first_name, last_name: editForm.last_name || undefined,
        gender: editForm.gender, dob: editForm.dob || undefined,
        email: editForm.email || undefined, sms_mobile: editForm.sms_mobile || undefined,
        whatsapp_mobile: editForm.whatsapp_mobile || undefined,
        blood_group: editForm.blood_group || undefined, aadhar_no: editForm.aadhar_no || undefined,
        saral_id: editForm.saral_id || undefined, apaar_id: editForm.apaar_id || undefined,
        pen: editForm.pen || undefined, class_section_id: editForm.class_section_id || undefined,
        reg_no: editForm.reg_no || undefined, roll_number: editForm.roll_number || undefined,
        card_number: editForm.card_number || undefined, cbse_reg_no: editForm.cbse_reg_no || undefined,
        ledger_no: editForm.ledger_no || undefined,
        papers: editForm.papers ? editForm.papers.split(',').map((x) => x.trim()).filter(Boolean) : undefined,
        additional_papers: editForm.additional_papers ? editForm.additional_papers.split(',').map((x) => x.trim()).filter(Boolean) : undefined,
        registration_date: editForm.registration_date || undefined, joining_date: editForm.joining_date || undefined,
        relieving_date: editForm.relieving_date || undefined, class_promoted_date: editForm.class_promoted_date || undefined,
        contact_address: editForm.contact_address || undefined, pin_code: editForm.pin_code || undefined,
        permanent_address: editForm.permanent_address || undefined, country: editForm.country || undefined,
        city_state: editForm.city_state || undefined, last_school_name: editForm.last_school_name || undefined,
        last_school_class: editForm.last_school_class || undefined, last_school_subjects: editForm.last_school_subjects || undefined,
        last_school_attendance: editForm.last_school_attendance ? Number(editForm.last_school_attendance) : undefined,
        transfer_certificate_no: editForm.transfer_certificate_no || undefined,
        student_type: editForm.student_type, admission_type: editForm.admission_type,
        fee_type: editForm.fee_type || undefined, caste_category: editForm.caste_category || undefined,
        student_category: editForm.student_category || undefined, house_category: editForm.house_category || undefined,
        hosteller: editForm.hosteller, has_sibling: editForm.has_sibling,
        fee_concession: editForm.fee_concession || undefined,
      });
      const deletedPGIds = (editingStudent.parent_guardians ?? [])
        .filter((pg) => !editExistingPGs.find((epg) => epg.id === pg.id))
        .map((pg) => pg.id);
      await Promise.all([
        ...deletedPGIds.map((pgId) => deleteParentGuardian(editingStudent.id, pgId)),
        ...editNewPGs
          .filter((pg) => pg.first_name.trim())
          .map((pg) => addParentGuardian(editingStudent.id, {
            relation: pg.relation,
            first_name: pg.first_name,
            last_name: pg.last_name || undefined,
            phone: pg.phone || undefined,
            email: pg.email || undefined,
            occupation: pg.occupation || undefined,
            is_primary: pg.is_primary,
          })),
      ]);
      return result;
    },
    onSuccess: () => {
      toast.success('Student updated');
      qc.invalidateQueries({ queryKey: ['students'] });
      setEditingStudent(null);
      setEditNewPGs([]);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to update student');
    },
  });

  const submitEdit = () => {
    if (!editForm.first_name.trim()) { toast.error('First name is required'); setEditTab('Personal'); return; }
    editMutation.mutate();
  };

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
      parent_guardians: parents.filter((p) => p.first_name.trim()).map((p) => ({
        relation: p.relation,
        first_name: p.first_name,
        last_name: p.last_name || undefined,
        phone: p.phone || undefined,
        email: p.email || undefined,
        occupation: p.occupation || undefined,
        is_primary: p.is_primary,
      })),
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
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
            {!isLoading && students.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
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

            {/* ── PARENTS ── */}
            {tab === 'Parents' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Add father, mother, or guardian details. First Name is used to save a parent entry.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setParents((p) => [...p, { ...PARENT_INIT }])}
                  >
                    + Add Parent
                  </Button>
                </div>

                {parents.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-border py-14 text-center text-sm text-muted-foreground">
                    No parents added yet. Click &ldquo;+ Add Parent&rdquo; to add father / mother / guardian details.
                  </div>
                )}

                {parents.map((pg, i) => (
                  <div key={i} className="rounded-xl border bg-muted/20 p-5 space-y-4 relative">
                    <button
                      onClick={() => setParents((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-3 right-4 text-muted-foreground hover:text-destructive text-lg leading-none"
                      title="Remove"
                    >
                      ×
                    </button>

                    <div className="grid grid-cols-4 gap-4">
                      <F label="Relation" required>
                        <select
                          className={SELECT}
                          value={pg.relation}
                          onChange={(e) =>
                            setParents((p) => p.map((r, j) => j === i ? { ...r, relation: e.target.value as ParentForm['relation'] } : r))
                          }
                        >
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="guardian">Guardian</option>
                        </select>
                      </F>
                      <F label="First Name" required>
                        <Input
                          className="h-10"
                          value={pg.first_name}
                          onChange={(e) =>
                            setParents((p) => p.map((r, j) => j === i ? { ...r, first_name: e.target.value } : r))
                          }
                          placeholder="First name"
                        />
                      </F>
                      <F label="Last Name">
                        <Input
                          className="h-10"
                          value={pg.last_name}
                          onChange={(e) =>
                            setParents((p) => p.map((r, j) => j === i ? { ...r, last_name: e.target.value } : r))
                          }
                          placeholder="Last name"
                        />
                      </F>
                      <F label="Phone">
                        <Input
                          className="h-10"
                          value={pg.phone}
                          onChange={(e) =>
                            setParents((p) => p.map((r, j) => j === i ? { ...r, phone: e.target.value } : r))
                          }
                          placeholder="+91 98765 43210"
                        />
                      </F>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <F label="Email">
                          <Input
                            type="email"
                            className="h-10"
                            value={pg.email}
                            onChange={(e) =>
                              setParents((p) => p.map((r, j) => j === i ? { ...r, email: e.target.value } : r))
                            }
                            placeholder="parent@example.com"
                          />
                        </F>
                      </div>
                      <F label="Occupation">
                        <Input
                          className="h-10"
                          value={pg.occupation}
                          onChange={(e) =>
                            setParents((p) => p.map((r, j) => j === i ? { ...r, occupation: e.target.value } : r))
                          }
                          placeholder="e.g. Engineer, Teacher"
                        />
                      </F>
                      <F label="Primary Contact">
                        <div className="h-10 flex items-center">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={pg.is_primary}
                              onChange={(e) =>
                                setParents((p) => p.map((r, j) => j === i ? { ...r, is_primary: e.target.checked } : r))
                              }
                              className="h-4 w-4 rounded border-input accent-primary"
                            />
                            <span className="text-sm text-muted-foreground">Mark as primary</span>
                          </label>
                        </div>
                      </F>
                    </div>
                  </div>
                ))}
              </div>
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
                      onClick={() => { setOpen(false); setForm(FORM_INIT); setParents([]); }}
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

      {/* ── Edit Student modal ── */}
      <Dialog open={!!editingStudent} onOpenChange={(o) => { if (!o) setEditingStudent(null); }}>
        <DialogContent className="w-[96vw] sm:max-w-[1200px] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="px-8 pt-6 pb-5 border-b shrink-0">
            <DialogTitle className="text-lg font-semibold">
              Edit Student — {editingStudent?.first_name} {editingStudent?.last_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Adm No: {editingStudent?.admission_no}</p>
          </DialogHeader>

          <div className="flex border-b bg-muted/20 shrink-0 overflow-x-auto">
            {EDIT_TABS.map((t, i) => (
              <button key={t} onClick={() => setEditTab(t)}
                className={`relative px-7 py-3 text-sm font-medium shrink-0 transition-colors ${editTab === t ? 'text-primary bg-background border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${editTab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                  {t}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">
            {editTab === 'Personal' && (
              <>
                <Section title="Basic Identity">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="First Name" required><Input className="h-10" value={efstr('first_name')} onChange={(e) => setEFm('first_name', e.target.value)} /></F>
                    <F label="Last Name"><Input className="h-10" value={efstr('last_name')} onChange={(e) => setEFm('last_name', e.target.value)} /></F>
                    <F label="Gender" required>
                      <select className={SELECT} value={efstr('gender')} onChange={(e) => setEFm('gender', e.target.value)}>
                        <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                      </select>
                    </F>
                    <F label="Date of Birth"><Input type="date" className="h-10" value={efstr('dob')} onChange={(e) => setEFm('dob', e.target.value)} /></F>
                  </div>
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Blood Group">
                      <select className={SELECT} value={efstr('blood_group')} onChange={(e) => setEFm('blood_group', e.target.value)}>
                        <option value="">— select —</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </F>
                    <F label="SMS Mobile"><Input className="h-10" value={efstr('sms_mobile')} onChange={(e) => setEFm('sms_mobile', e.target.value)} /></F>
                    <F label="WhatsApp Mobile"><Input className="h-10" value={efstr('whatsapp_mobile')} onChange={(e) => setEFm('whatsapp_mobile', e.target.value)} /></F>
                    <F label="Email"><Input type="email" className="h-10" value={efstr('email')} onChange={(e) => setEFm('email', e.target.value)} /></F>
                  </div>
                </Section>
                <Section title="Government IDs">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Aadhar No"><Input className="h-10" value={efstr('aadhar_no')} onChange={(e) => setEFm('aadhar_no', e.target.value)} /></F>
                    <F label="Saral ID"><Input className="h-10" value={efstr('saral_id')} onChange={(e) => setEFm('saral_id', e.target.value)} /></F>
                    <F label="APAAR ID"><Input className="h-10" value={efstr('apaar_id')} onChange={(e) => setEFm('apaar_id', e.target.value)} /></F>
                    <F label="PEN"><Input className="h-10" value={efstr('pen')} onChange={(e) => setEFm('pen', e.target.value)} /></F>
                  </div>
                </Section>
              </>
            )}
            {editTab === 'Academic' && (
              <>
                <Section title="Class Placement">
                  <div className="grid grid-cols-4 gap-5">
                    <div className="col-span-2"><F label="Class Section"><ClassSectionPicker value={efstr('class_section_id')} onChange={(id) => setEFm('class_section_id', id)} placeholder="— select class section —" /></F></div>
                    <F label="Roll Number"><Input className="h-10" value={efstr('roll_number')} onChange={(e) => setEFm('roll_number', e.target.value)} /></F>
                    <F label="Registration Number"><Input className="h-10" value={efstr('reg_no')} onChange={(e) => setEFm('reg_no', e.target.value)} /></F>
                  </div>
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Papers" hint="Comma-separated"><Input className="h-10" value={efstr('papers')} onChange={(e) => setEFm('papers', e.target.value)} /></F>
                    <F label="Additional Papers" hint="Comma-separated"><Input className="h-10" value={efstr('additional_papers')} onChange={(e) => setEFm('additional_papers', e.target.value)} /></F>
                  </div>
                </Section>
                <Section title="ID Numbers">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Admission Number"><Input className="h-10 opacity-50" disabled value={editingStudent?.admission_no ?? ''} /></F>
                    <F label="Card Number"><Input className="h-10" value={efstr('card_number')} onChange={(e) => setEFm('card_number', e.target.value)} /></F>
                    <F label="CBSE Registration No"><Input className="h-10" value={efstr('cbse_reg_no')} onChange={(e) => setEFm('cbse_reg_no', e.target.value)} /></F>
                    <F label="Ledger No"><Input className="h-10" value={efstr('ledger_no')} onChange={(e) => setEFm('ledger_no', e.target.value)} /></F>
                  </div>
                </Section>
                <Section title="Key Dates">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Registration Date"><Input type="date" className="h-10" value={efstr('registration_date')} onChange={(e) => setEFm('registration_date', e.target.value)} /></F>
                    <F label="Joining Date"><Input type="date" className="h-10" value={efstr('joining_date')} onChange={(e) => setEFm('joining_date', e.target.value)} /></F>
                    <F label="Relieving Date"><Input type="date" className="h-10" value={efstr('relieving_date')} onChange={(e) => setEFm('relieving_date', e.target.value)} /></F>
                    <F label="Class Promoted Date"><Input type="date" className="h-10" value={efstr('class_promoted_date')} onChange={(e) => setEFm('class_promoted_date', e.target.value)} /></F>
                  </div>
                </Section>
              </>
            )}
            {editTab === 'Address' && (
              <Section title="Address Details">
                <div className="grid grid-cols-2 gap-6">
                  <F label="Contact Address"><TArea rows={4} value={efstr('contact_address')} onChange={(v) => setEFm('contact_address', v)} /></F>
                  <F label="Permanent Address"><TArea rows={4} value={efstr('permanent_address')} onChange={(v) => setEFm('permanent_address', v)} /></F>
                </div>
                <div className="grid grid-cols-4 gap-5">
                  <F label="Pin Code"><Input className="h-10" value={efstr('pin_code')} onChange={(e) => setEFm('pin_code', e.target.value)} /></F>
                  <div className="col-span-2"><F label="City / State"><Input className="h-10" value={efstr('city_state')} onChange={(e) => setEFm('city_state', e.target.value)} /></F></div>
                  <F label="Country"><Input className="h-10" value={efstr('country')} onChange={(e) => setEFm('country', e.target.value)} /></F>
                </div>
              </Section>
            )}
            {editTab === 'Prev. School' && (
              <Section title="Previous School Details">
                <div className="grid grid-cols-2 gap-5">
                  <F label="Last School Name"><Input className="h-10" value={efstr('last_school_name')} onChange={(e) => setEFm('last_school_name', e.target.value)} /></F>
                  <F label="Last School Class"><Input className="h-10" value={efstr('last_school_class')} onChange={(e) => setEFm('last_school_class', e.target.value)} /></F>
                </div>
                <F label="Last School Subjects" hint="Comma-separated"><Input className="h-10" value={efstr('last_school_subjects')} onChange={(e) => setEFm('last_school_subjects', e.target.value)} /></F>
                <div className="grid grid-cols-4 gap-5">
                  <F label="Attendance (days)"><Input type="number" min="0" className="h-10" value={efstr('last_school_attendance')} onChange={(e) => setEFm('last_school_attendance', e.target.value)} /></F>
                  <div className="col-span-2"><F label="Transfer Certificate No"><Input className="h-10" value={efstr('transfer_certificate_no')} onChange={(e) => setEFm('transfer_certificate_no', e.target.value)} /></F></div>
                </div>
              </Section>
            )}
            {editTab === 'Parents' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Remove existing parents or add new ones. Changes take effect when you save.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditNewPGs((p) => [...p, { ...PARENT_INIT }])}
                  >
                    + Add Parent
                  </Button>
                </div>

                {editExistingPGs.length === 0 && editNewPGs.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-border py-14 text-center text-sm text-muted-foreground">
                    No parents recorded. Click &ldquo;+ Add Parent&rdquo; to add one.
                  </div>
                )}

                {editExistingPGs.map((pg) => (
                  <div key={pg.id} className="rounded-xl border bg-muted/20 p-5 space-y-3 relative">
                    <button
                      onClick={() => setEditExistingPGs((prev) => prev.filter((p) => p.id !== pg.id))}
                      className="absolute top-3 right-4 text-muted-foreground hover:text-destructive text-lg leading-none"
                      title="Remove"
                    >
                      ×
                    </button>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">Relation</p>
                        <p className="text-sm capitalize mt-1">{pg.relation}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">Name</p>
                        <p className="text-sm mt-1">{[pg.first_name, pg.last_name].filter(Boolean).join(' ') || pg.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">Phone</p>
                        <p className="text-sm mt-1">{pg.phone ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">Email</p>
                        <p className="text-sm mt-1">{pg.email ?? '—'}</p>
                      </div>
                    </div>
                    {(pg.occupation || pg.is_primary) && (
                      <div className="flex items-center gap-6">
                        {pg.occupation && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">Occupation</p>
                            <p className="text-sm mt-1">{pg.occupation}</p>
                          </div>
                        )}
                        {pg.is_primary && (
                          <Badge variant="secondary" className="text-[10px] mt-3">Primary Contact</Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {editNewPGs.map((pg, i) => (
                  <div key={`new-${i}`} className="rounded-xl border border-dashed bg-muted/10 p-5 space-y-4 relative">
                    <span className="absolute top-3 left-5 text-[10px] text-primary font-semibold uppercase tracking-wide">New</span>
                    <button
                      onClick={() => setEditNewPGs((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-3 right-4 text-muted-foreground hover:text-destructive text-lg leading-none"
                      title="Remove"
                    >
                      ×
                    </button>
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <F label="Relation" required>
                        <select
                          className={SELECT}
                          value={pg.relation}
                          onChange={(e) => setEditNewPGs((p) => p.map((r, j) => j === i ? { ...r, relation: e.target.value as ParentForm['relation'] } : r))}
                        >
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="guardian">Guardian</option>
                        </select>
                      </F>
                      <F label="First Name" required>
                        <Input
                          className="h-10"
                          value={pg.first_name}
                          onChange={(e) => setEditNewPGs((p) => p.map((r, j) => j === i ? { ...r, first_name: e.target.value } : r))}
                          placeholder="First name"
                        />
                      </F>
                      <F label="Last Name">
                        <Input
                          className="h-10"
                          value={pg.last_name}
                          onChange={(e) => setEditNewPGs((p) => p.map((r, j) => j === i ? { ...r, last_name: e.target.value } : r))}
                          placeholder="Last name"
                        />
                      </F>
                      <F label="Phone">
                        <Input
                          className="h-10"
                          value={pg.phone}
                          onChange={(e) => setEditNewPGs((p) => p.map((r, j) => j === i ? { ...r, phone: e.target.value } : r))}
                          placeholder="+91 98765 43210"
                        />
                      </F>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <F label="Email">
                          <Input
                            type="email"
                            className="h-10"
                            value={pg.email}
                            onChange={(e) => setEditNewPGs((p) => p.map((r, j) => j === i ? { ...r, email: e.target.value } : r))}
                            placeholder="parent@example.com"
                          />
                        </F>
                      </div>
                      <F label="Occupation">
                        <Input
                          className="h-10"
                          value={pg.occupation}
                          onChange={(e) => setEditNewPGs((p) => p.map((r, j) => j === i ? { ...r, occupation: e.target.value } : r))}
                          placeholder="e.g. Engineer"
                        />
                      </F>
                      <F label="Primary Contact">
                        <div className="h-10 flex items-center">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={pg.is_primary}
                              onChange={(e) => setEditNewPGs((p) => p.map((r, j) => j === i ? { ...r, is_primary: e.target.checked } : r))}
                              className="h-4 w-4 rounded border-input accent-primary"
                            />
                            <span className="text-sm text-muted-foreground">Mark as primary</span>
                          </label>
                        </div>
                      </F>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editTab === 'Other' && (
              <>
                <Section title="Admission Details">
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Student Type">
                      <select className={SELECT} value={efstr('student_type')} onChange={(e) => setEFm('student_type', e.target.value)}>
                        <option value="new">New Student</option><option value="old">Old Student</option>
                      </select>
                    </F>
                    <F label="Admission Type">
                      <select className={SELECT} value={efstr('admission_type')} onChange={(e) => setEFm('admission_type', e.target.value)}>
                        <option value="regular">Regular</option><option value="daycare">Daycare</option><option value="boarding">Boarding</option><option value="both">Both</option>
                      </select>
                    </F>
                    <F label="Fee Type">
                      <select className={SELECT} value={efstr('fee_type')} onChange={(e) => setEFm('fee_type', e.target.value)}>
                        <option value="">— select —</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="half_yearly">Half Yearly</option><option value="annually">Annually</option>
                      </select>
                    </F>
                    <F label="Fee Concession"><Input className="h-10" value={efstr('fee_concession')} onChange={(e) => setEFm('fee_concession', e.target.value)} /></F>
                  </div>
                </Section>
                <Section title="Category">
                  <div className="grid grid-cols-3 gap-5">
                    <F label="Caste Category"><Input className="h-10" value={efstr('caste_category')} onChange={(e) => setEFm('caste_category', e.target.value)} /></F>
                    <F label="Student Category"><Input className="h-10" value={efstr('student_category')} onChange={(e) => setEFm('student_category', e.target.value)} /></F>
                    <F label="House Category"><Input className="h-10" value={efstr('house_category')} onChange={(e) => setEFm('house_category', e.target.value)} /></F>
                  </div>
                </Section>
                <Section title="Flags">
                  <div className="flex flex-wrap gap-8">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input type="checkbox" checked={editForm.hosteller} onChange={(e) => setEFm('hosteller', e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
                      <span className="text-sm text-muted-foreground">Is Hosteller</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input type="checkbox" checked={editForm.has_sibling} onChange={(e) => setEFm('has_sibling', e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
                      <span className="text-sm text-muted-foreground">Has Sibling</span>
                    </label>
                  </div>
                </Section>
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 px-8 border-t">
            <div className="flex items-center justify-between w-full py-3">
              <div className="flex gap-1.5">
                {EDIT_TABS.map((t) => (
                  <button key={t} onClick={() => setEditTab(t)} title={t}
                    className={`rounded-full transition-all duration-200 ${editTab === t ? 'w-8 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/50'}`}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                {editTab !== 'Personal' && (
                  <Button variant="outline" onClick={() => setEditTab(EDIT_TABS[EDIT_TABS.indexOf(editTab) - 1])}>← Back</Button>
                )}
                {editTab !== 'Other' ? (
                  <Button onClick={() => setEditTab(EDIT_TABS[EDIT_TABS.indexOf(editTab) + 1])}>Next →</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEditingStudent(null)} disabled={editMutation.isPending}>Cancel</Button>
                    <Button onClick={submitEdit} disabled={editMutation.isPending}>
                      {editMutation.isPending ? 'Saving…' : 'Save Changes'}
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
