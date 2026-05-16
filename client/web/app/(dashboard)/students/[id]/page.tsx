'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudent, updateStudent } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { ClassSectionPicker } from '@/components/shared/ClassSectionPicker';
import { use } from 'react';
import { toast } from 'sonner';
import { Student } from '@/types/student';

// ── Shared primitives (same as students/page.tsx) ────────────────────────────

const SELECT =
  'w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent ' +
  'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring h-10 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

function F({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground tracking-wide">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
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
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</p>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

function TArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
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

function Row({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex gap-3">
      <span className="w-36 text-muted-foreground shrink-0 text-xs pt-0.5">{label}</span>
      <span className="text-sm">{String(value)}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-3">{title}</p>
      {children}
    </div>
  );
}

// ── Edit modal tabs ──────────────────────────────────────────────────────────

const TABS = ['Personal', 'Academic', 'Address', 'Prev. School', 'Other'] as const;
type Tab = typeof TABS[number];

function studentToForm(s: Student) {
  return {
    first_name: s.first_name ?? '',
    last_name: s.last_name ?? '',
    gender: s.gender ?? 'male',
    dob: s.dob ?? '',
    email: s.email ?? '',
    sms_mobile: s.sms_mobile ?? '',
    whatsapp_mobile: s.whatsapp_mobile ?? '',
    blood_group: s.blood_group ?? '',
    aadhar_no: s.aadhar_no ?? '',
    saral_id: s.saral_id ?? '',
    apaar_id: s.apaar_id ?? '',
    pen: s.pen ?? '',
    class_section_id: s.class_section_id ?? '',
    reg_no: s.reg_no ?? '',
    roll_number: s.roll_number ?? '',
    card_number: s.card_number ?? '',
    cbse_reg_no: s.cbse_reg_no ?? '',
    ledger_no: s.ledger_no ?? '',
    papers: (s.papers ?? []).join(', '),
    additional_papers: (s.additional_papers ?? []).join(', '),
    registration_date: s.registration_date ?? '',
    joining_date: s.joining_date ?? '',
    relieving_date: s.relieving_date ?? '',
    class_promoted_date: s.class_promoted_date ?? '',
    contact_address: s.contact_address ?? '',
    pin_code: s.pin_code ?? '',
    permanent_address: s.permanent_address ?? '',
    country: s.country ?? '',
    city_state: s.city_state ?? '',
    last_school_name: s.last_school_name ?? '',
    last_school_class: s.last_school_class ?? '',
    last_school_subjects: s.last_school_subjects ?? '',
    last_school_attendance: s.last_school_attendance != null ? String(s.last_school_attendance) : '',
    transfer_certificate_no: s.transfer_certificate_no ?? '',
    student_type: s.student_type ?? 'new',
    admission_type: s.admission_type ?? 'regular',
    fee_type: s.fee_type ?? '',
    caste_category: s.caste_category ?? '',
    student_category: s.student_category ?? '',
    house_category: s.house_category ?? '',
    hosteller: s.hosteller ?? false,
    has_sibling: s.has_sibling ?? false,
    fee_concession: s.fee_concession ?? '',
  };
}

type FormState = ReturnType<typeof studentToForm>;

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const s: Student | undefined = data?.data;

  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('Personal');
  const [form, setForm] = useState<FormState | null>(null);

  const openEdit = () => {
    if (s) { setForm(studentToForm(s)); setTab('Personal'); setEditOpen(true); }
  };

  const setFm = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => p ? { ...p, [k]: v } : p);
  const fstr = (k: keyof FormState) => (form?.[k] as string) ?? '';

  const toggleStatus = useMutation({
    mutationFn: () => updateStudent(id, { status: s?.status === 'active' ? 'inactive' : 'active' }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['student', id] }); },
    onError: () => toast.error('Failed to update status'),
  });

  const editMutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('No form');
      return updateStudent(id, {
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        gender: form.gender,
        dob: form.dob || undefined,
        email: form.email || undefined,
        sms_mobile: form.sms_mobile || undefined,
        whatsapp_mobile: form.whatsapp_mobile || undefined,
        blood_group: form.blood_group || undefined,
        aadhar_no: form.aadhar_no || undefined,
        saral_id: form.saral_id || undefined,
        apaar_id: form.apaar_id || undefined,
        pen: form.pen || undefined,
        class_section_id: form.class_section_id || undefined,
        reg_no: form.reg_no || undefined,
        roll_number: form.roll_number || undefined,
        card_number: form.card_number || undefined,
        cbse_reg_no: form.cbse_reg_no || undefined,
        ledger_no: form.ledger_no || undefined,
        papers: form.papers ? form.papers.split(',').map((x) => x.trim()).filter(Boolean) : undefined,
        additional_papers: form.additional_papers ? form.additional_papers.split(',').map((x) => x.trim()).filter(Boolean) : undefined,
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
        last_school_attendance: form.last_school_attendance ? Number(form.last_school_attendance) : undefined,
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
    },
    onSuccess: () => {
      toast.success('Student updated');
      qc.invalidateQueries({ queryKey: ['student', id] });
      setEditOpen(false);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to update student');
    },
  });

  const submitEdit = () => {
    if (!form?.first_name.trim()) { toast.error('First name is required'); setTab('Personal'); return; }
    editMutation.mutate();
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!s) return <p className="text-muted-foreground">Student not found</p>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{s.first_name} {s.last_name}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
          <Button size="sm" variant="outline" onClick={() => toggleStatus.mutate()} disabled={toggleStatus.isPending}>
            {s.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" onClick={openEdit}>Edit</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Personal">
          <Row label="Gender" value={s.gender} />
          <Row label="Date of Birth" value={s.dob} />
          <Row label="Blood Group" value={s.blood_group} />
          <Row label="Email" value={s.email} />
          <Row label="SMS Mobile" value={s.sms_mobile} />
          <Row label="WhatsApp Mobile" value={s.whatsapp_mobile} />
          <Row label="Aadhar No" value={s.aadhar_no} />
          <Row label="Saral ID" value={s.saral_id} />
          <Row label="APAAR ID" value={s.apaar_id} />
          <Row label="PEN" value={s.pen} />
        </Card>

        <Card title="Academic">
          <Row label="Admission No" value={s.admission_no} />
          <Row label="Class" value={s.class_name ? `${s.class_name} ${s.section}` : undefined} />
          <Row label="Roll Number" value={s.roll_number} />
          <Row label="Reg No" value={s.reg_no} />
          <Row label="Card Number" value={s.card_number} />
          <Row label="CBSE Reg No" value={s.cbse_reg_no} />
          <Row label="Ledger No" value={s.ledger_no} />
          <Row label="Student Type" value={s.student_type} />
          <Row label="Admission Type" value={s.admission_type} />
          <Row label="Hosteller" value={s.hosteller ? 'Yes' : 'No'} />
          <Row label="Fee Type" value={s.fee_type} />
        </Card>

        <Card title="Classification">
          <Row label="Caste Category" value={s.caste_category} />
          <Row label="Student Category" value={s.student_category} />
          <Row label="House Category" value={s.house_category} />
          <Row label="Fee Concession" value={s.fee_concession} />
          <Row label="Has Sibling" value={s.has_sibling ? 'Yes' : 'No'} />
        </Card>

        <Card title="Address">
          <Row label="Contact Address" value={s.contact_address} />
          <Row label="Permanent Address" value={s.permanent_address} />
          <Row label="Pin Code" value={s.pin_code} />
          <Row label="City / State" value={s.city_state} />
          <Row label="Country" value={s.country} />
        </Card>

        {(s.last_school_name || s.transfer_certificate_no) && (
          <Card title="Previous School">
            <Row label="School Name" value={s.last_school_name} />
            <Row label="Class" value={s.last_school_class} />
            <Row label="Subjects" value={s.last_school_subjects} />
            <Row label="Attendance (days)" value={s.last_school_attendance} />
            <Row label="TC No" value={s.transfer_certificate_no} />
          </Card>
        )}

        <Card title="Dates">
          <Row label="Registration Date" value={s.registration_date} />
          <Row label="Joining Date" value={s.joining_date} />
          <Row label="Relieving Date" value={s.relieving_date} />
          <Row label="Class Promoted" value={s.class_promoted_date} />
        </Card>
      </div>

      {/* ── Edit modal ── */}
      {form && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[96vw] sm:max-w-[1200px] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl">
            <DialogHeader className="px-8 pt-6 pb-5 border-b shrink-0">
              <DialogTitle className="text-lg font-semibold">Edit Student — {s.first_name} {s.last_name}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Admission No: {s.admission_no}</p>
            </DialogHeader>

            {/* Tab bar */}
            <div className="flex border-b bg-muted/20 shrink-0 overflow-x-auto">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative px-7 py-3 text-sm font-medium shrink-0 transition-colors ${
                    tab === t
                      ? 'text-primary bg-background border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>{i + 1}</span>
                    {t}
                  </span>
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">
              {tab === 'Personal' && (
                <>
                  <Section title="Basic Identity">
                    <div className="grid grid-cols-4 gap-5">
                      <F label="First Name" required>
                        <Input className="h-10" value={fstr('first_name')} onChange={(e) => setFm('first_name', e.target.value)} />
                      </F>
                      <F label="Last Name">
                        <Input className="h-10" value={fstr('last_name')} onChange={(e) => setFm('last_name', e.target.value)} />
                      </F>
                      <F label="Gender" required>
                        <select className={SELECT} value={fstr('gender')} onChange={(e) => setFm('gender', e.target.value)}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </F>
                      <F label="Date of Birth">
                        <Input type="date" className="h-10" value={fstr('dob')} onChange={(e) => setFm('dob', e.target.value)} />
                      </F>
                    </div>
                    <div className="grid grid-cols-4 gap-5">
                      <F label="Blood Group">
                        <select className={SELECT} value={fstr('blood_group')} onChange={(e) => setFm('blood_group', e.target.value)}>
                          <option value="">— select —</option>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      </F>
                      <F label="SMS Mobile">
                        <Input className="h-10" value={fstr('sms_mobile')} onChange={(e) => setFm('sms_mobile', e.target.value)} />
                      </F>
                      <F label="WhatsApp Mobile">
                        <Input className="h-10" value={fstr('whatsapp_mobile')} onChange={(e) => setFm('whatsapp_mobile', e.target.value)} />
                      </F>
                      <F label="Email">
                        <Input type="email" className="h-10" value={fstr('email')} onChange={(e) => setFm('email', e.target.value)} />
                      </F>
                    </div>
                  </Section>
                  <Section title="Government IDs">
                    <div className="grid grid-cols-4 gap-5">
                      <F label="Aadhar No">
                        <Input className="h-10" value={fstr('aadhar_no')} onChange={(e) => setFm('aadhar_no', e.target.value)} />
                      </F>
                      <F label="Saral ID">
                        <Input className="h-10" value={fstr('saral_id')} onChange={(e) => setFm('saral_id', e.target.value)} />
                      </F>
                      <F label="APAAR ID">
                        <Input className="h-10" value={fstr('apaar_id')} onChange={(e) => setFm('apaar_id', e.target.value)} />
                      </F>
                      <F label="PEN" hint="Permanent Education Number">
                        <Input className="h-10" value={fstr('pen')} onChange={(e) => setFm('pen', e.target.value)} />
                      </F>
                    </div>
                  </Section>
                </>
              )}

              {tab === 'Academic' && (
                <>
                  <Section title="Class Placement">
                    <div className="grid grid-cols-4 gap-5">
                      <div className="col-span-2">
                        <F label="Class Section">
                          <ClassSectionPicker value={fstr('class_section_id')} onChange={(id) => setFm('class_section_id', id)} placeholder="— select class section —" />
                        </F>
                      </div>
                      <F label="Roll Number">
                        <Input className="h-10" value={fstr('roll_number')} onChange={(e) => setFm('roll_number', e.target.value)} />
                      </F>
                      <F label="Registration Number">
                        <Input className="h-10" value={fstr('reg_no')} onChange={(e) => setFm('reg_no', e.target.value)} />
                      </F>
                    </div>
                    <div className="grid grid-cols-4 gap-5">
                      <F label="Papers" hint="Comma-separated subject names">
                        <Input className="h-10" value={fstr('papers')} onChange={(e) => setFm('papers', e.target.value)} />
                      </F>
                      <F label="Additional Papers" hint="Comma-separated">
                        <Input className="h-10" value={fstr('additional_papers')} onChange={(e) => setFm('additional_papers', e.target.value)} />
                      </F>
                    </div>
                  </Section>
                  <Section title="ID Numbers">
                    <div className="grid grid-cols-4 gap-5">
                      <F label="Admission Number">
                        <Input className="h-10 opacity-50" disabled value={s.admission_no} />
                      </F>
                      <F label="Card Number">
                        <Input className="h-10" value={fstr('card_number')} onChange={(e) => setFm('card_number', e.target.value)} />
                      </F>
                      <F label="CBSE Registration No">
                        <Input className="h-10" value={fstr('cbse_reg_no')} onChange={(e) => setFm('cbse_reg_no', e.target.value)} />
                      </F>
                      <F label="Ledger No">
                        <Input className="h-10" value={fstr('ledger_no')} onChange={(e) => setFm('ledger_no', e.target.value)} />
                      </F>
                    </div>
                  </Section>
                  <Section title="Key Dates">
                    <div className="grid grid-cols-4 gap-5">
                      <F label="Registration Date">
                        <Input type="date" className="h-10" value={fstr('registration_date')} onChange={(e) => setFm('registration_date', e.target.value)} />
                      </F>
                      <F label="Joining Date">
                        <Input type="date" className="h-10" value={fstr('joining_date')} onChange={(e) => setFm('joining_date', e.target.value)} />
                      </F>
                      <F label="Relieving Date">
                        <Input type="date" className="h-10" value={fstr('relieving_date')} onChange={(e) => setFm('relieving_date', e.target.value)} />
                      </F>
                      <F label="Class Promoted Date">
                        <Input type="date" className="h-10" value={fstr('class_promoted_date')} onChange={(e) => setFm('class_promoted_date', e.target.value)} />
                      </F>
                    </div>
                  </Section>
                </>
              )}

              {tab === 'Address' && (
                <Section title="Address Details">
                  <div className="grid grid-cols-2 gap-6">
                    <F label="Contact Address">
                      <TArea rows={4} value={fstr('contact_address')} onChange={(v) => setFm('contact_address', v)} />
                    </F>
                    <F label="Permanent Address">
                      <TArea rows={4} value={fstr('permanent_address')} onChange={(v) => setFm('permanent_address', v)} />
                    </F>
                  </div>
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Pin Code">
                      <Input className="h-10" value={fstr('pin_code')} onChange={(e) => setFm('pin_code', e.target.value)} />
                    </F>
                    <div className="col-span-2">
                      <F label="City / State">
                        <Input className="h-10" value={fstr('city_state')} onChange={(e) => setFm('city_state', e.target.value)} />
                      </F>
                    </div>
                    <F label="Country">
                      <Input className="h-10" value={fstr('country')} onChange={(e) => setFm('country', e.target.value)} />
                    </F>
                  </div>
                </Section>
              )}

              {tab === 'Prev. School' && (
                <Section title="Previous School Details">
                  <div className="grid grid-cols-2 gap-5">
                    <F label="Last School Name">
                      <Input className="h-10" value={fstr('last_school_name')} onChange={(e) => setFm('last_school_name', e.target.value)} />
                    </F>
                    <F label="Last School Class">
                      <Input className="h-10" value={fstr('last_school_class')} onChange={(e) => setFm('last_school_class', e.target.value)} />
                    </F>
                  </div>
                  <F label="Last School Subjects" hint="Comma-separated">
                    <Input className="h-10" value={fstr('last_school_subjects')} onChange={(e) => setFm('last_school_subjects', e.target.value)} />
                  </F>
                  <div className="grid grid-cols-4 gap-5">
                    <F label="Attendance (days)">
                      <Input type="number" min="0" className="h-10" value={fstr('last_school_attendance')} onChange={(e) => setFm('last_school_attendance', e.target.value)} />
                    </F>
                    <div className="col-span-2">
                      <F label="Transfer Certificate No">
                        <Input className="h-10" value={fstr('transfer_certificate_no')} onChange={(e) => setFm('transfer_certificate_no', e.target.value)} />
                      </F>
                    </div>
                  </div>
                </Section>
              )}

              {tab === 'Other' && (
                <>
                  <Section title="Admission Details">
                    <div className="grid grid-cols-4 gap-5">
                      <F label="Student Type">
                        <select className={SELECT} value={fstr('student_type')} onChange={(e) => setFm('student_type', e.target.value)}>
                          <option value="new">New Student</option>
                          <option value="old">Old Student</option>
                        </select>
                      </F>
                      <F label="Admission Type">
                        <select className={SELECT} value={fstr('admission_type')} onChange={(e) => setFm('admission_type', e.target.value)}>
                          <option value="regular">Regular</option>
                          <option value="daycare">Daycare</option>
                          <option value="boarding">Boarding</option>
                          <option value="both">Both</option>
                        </select>
                      </F>
                      <F label="Fee Type">
                        <select className={SELECT} value={fstr('fee_type')} onChange={(e) => setFm('fee_type', e.target.value)}>
                          <option value="">— select —</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="half_yearly">Half Yearly</option>
                          <option value="annually">Annually</option>
                        </select>
                      </F>
                      <F label="Fee Concession">
                        <Input className="h-10" value={fstr('fee_concession')} onChange={(e) => setFm('fee_concession', e.target.value)} />
                      </F>
                    </div>
                  </Section>
                  <Section title="Category">
                    <div className="grid grid-cols-3 gap-5">
                      <F label="Caste Category">
                        <Input className="h-10" value={fstr('caste_category')} onChange={(e) => setFm('caste_category', e.target.value)} />
                      </F>
                      <F label="Student Category">
                        <Input className="h-10" value={fstr('student_category')} onChange={(e) => setFm('student_category', e.target.value)} />
                      </F>
                      <F label="House Category">
                        <Input className="h-10" value={fstr('house_category')} onChange={(e) => setFm('house_category', e.target.value)} />
                      </F>
                    </div>
                  </Section>
                  <Section title="Flags">
                    <div className="flex flex-wrap gap-8">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.hosteller}
                          onChange={(e) => setFm('hosteller', e.target.checked)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span className="text-sm text-muted-foreground">Is Hosteller</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.has_sibling}
                          onChange={(e) => setFm('has_sibling', e.target.checked)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
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
                  {TABS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      title={t}
                      className={`w-2 h-2 rounded-full transition-colors ${tab === t ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button onClick={submitEdit} disabled={editMutation.isPending}>
                    {editMutation.isPending ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
