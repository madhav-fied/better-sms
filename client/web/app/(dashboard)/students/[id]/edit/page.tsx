'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getStudent, updateStudent, getClassSections } from '@/lib/api/students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import LabeledSelect from '@/components/enterprise/LabeledSelect';
import DataSection from '@/components/enterprise/DataSection';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const FEE_TYPE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'annually', label: 'Annually' },
];

const ADMISSION_TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'daycare', label: 'Daycare' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'both', label: 'Both' },
];

const STUDENT_TYPE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'old', label: 'Old' },
];

type FormState = {
  first_name: string;
  last_name: string;
  gender: string;
  dob: string;
  blood_group: string;
  sms_mobile: string;
  whatsapp_mobile: string;
  email: string;
  roll_number: string;
  class_section_id: string;
  aadhar_no: string;
  apaar_id: string;
  pen: string;
  cbse_reg_no: string;
  saral_id: string;
  card_number: string;
  ledger_no: string;
  contact_address: string;
  permanent_address: string;
  city_state: string;
  pin_code: string;
  fee_type: string;
  student_type: string;
  admission_type: string;
  hosteller: string;
  last_school_name: string;
};

export default function StudentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const { data: sectionsData } = useQuery({ queryKey: ['class-sections'], queryFn: () => getClassSections() });

  const student = data?.data;
  const sections = sectionsData?.data ?? [];

  const [form, setForm] = useState<FormState>({
    first_name: '', last_name: '', gender: '', dob: '', blood_group: '',
    sms_mobile: '', whatsapp_mobile: '', email: '', roll_number: '', class_section_id: '',
    aadhar_no: '', apaar_id: '', pen: '', cbse_reg_no: '', saral_id: '', card_number: '', ledger_no: '',
    contact_address: '', permanent_address: '', city_state: '', pin_code: '',
    fee_type: '', student_type: '', admission_type: '', hosteller: '', last_school_name: '',
  });

  useEffect(() => {
    if (student) {
      const parts = student.name.split(' ');
      setForm({
        first_name: parts[0] ?? '',
        last_name: parts.slice(1).join(' '),
        gender: student.gender ?? '',
        dob: student.dob ?? '',
        blood_group: student.blood_group ?? '',
        sms_mobile: student.phone ?? '',
        whatsapp_mobile: student.whatsapp_mobile ?? '',
        email: student.email ?? '',
        roll_number: student.roll_number ?? '',
        class_section_id: student.class_section_id ?? '',
        aadhar_no: student.aadhar_no ?? '',
        apaar_id: student.apaar_id ?? '',
        pen: student.pen ?? '',
        cbse_reg_no: student.cbse_reg_no ?? '',
        saral_id: student.saral_id ?? '',
        card_number: student.card_number ?? '',
        ledger_no: student.ledger_no ?? '',
        contact_address: student.contact_address ?? '',
        permanent_address: student.permanent_address ?? '',
        city_state: student.city_state ?? '',
        pin_code: student.pin_code ?? '',
        fee_type: student.fee_type ?? '',
        student_type: student.student_type ?? '',
        admission_type: student.admission_type ?? '',
        hosteller: student.hosteller === true ? 'true' : student.hosteller === false ? 'false' : '',
        last_school_name: student.last_school_name ?? '',
      });
    }
  }, [student]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      updateStudent(id, {
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        gender: form.gender || undefined,
        dob: form.dob || undefined,
        blood_group: form.blood_group || undefined,
        sms_mobile: form.sms_mobile || undefined,
        whatsapp_mobile: form.whatsapp_mobile || undefined,
        email: form.email || undefined,
        roll_number: form.roll_number || undefined,
        class_section_id: form.class_section_id || undefined,
        aadhar_no: form.aadhar_no || undefined,
        apaar_id: form.apaar_id || undefined,
        pen: form.pen || undefined,
        cbse_reg_no: form.cbse_reg_no || undefined,
        saral_id: form.saral_id || undefined,
        card_number: form.card_number || undefined,
        ledger_no: form.ledger_no || undefined,
        contact_address: form.contact_address || undefined,
        permanent_address: form.permanent_address || undefined,
        city_state: form.city_state || undefined,
        pin_code: form.pin_code || undefined,
        fee_type: form.fee_type || undefined,
        student_type: form.student_type || undefined,
        admission_type: form.admission_type || undefined,
        hosteller: form.hosteller === 'true' ? true : form.hosteller === 'false' ? false : undefined,
        last_school_name: form.last_school_name || undefined,
      }),
    onSuccess: () => {
      toast.success('Student updated');
      router.push(`/students/${id}`);
    },
    onError: () => toast.error('Failed to update student'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Student not found</p>
        <ActionLink href="/students" className="mt-4">Back to students</ActionLink>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={`Edit — ${student.name}`}
        description="Update student profile and enrollment details."
        actions={
          <ActionLink href={`/students/${id}`} variant="outline">Cancel</ActionLink>
        }
      />

      {/* Basic */}
      <DataSection title="Basic details">
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="First name" id="first-name">
            <Input id="first-name" value={form.first_name} onChange={set('first_name')} className="border-slate-200" />
          </Field>
          <Field label="Last name" id="last-name">
            <Input id="last-name" value={form.last_name} onChange={set('last_name')} className="border-slate-200" />
          </Field>
          <LabeledSelect label="Gender" value={form.gender} onChange={set('gender')}
            options={GENDER_OPTIONS} placeholder="Select gender" />
          <Field label="Date of birth" id="dob">
            <Input id="dob" type="date" value={form.dob} onChange={set('dob')} className="border-slate-200" />
          </Field>
          <Field label="Blood group" id="blood-group">
            <Input id="blood-group" value={form.blood_group} onChange={set('blood_group')} placeholder="e.g. O+" className="border-slate-200" />
          </Field>
          <Field label="Mobile" id="mobile">
            <Input id="mobile" value={form.sms_mobile} onChange={set('sms_mobile')} className="border-slate-200" />
          </Field>
          <Field label="WhatsApp" id="whatsapp">
            <Input id="whatsapp" value={form.whatsapp_mobile} onChange={set('whatsapp_mobile')} className="border-slate-200" />
          </Field>
          <Field label="Email" id="email">
            <Input id="email" type="email" value={form.email} onChange={set('email')} className="border-slate-200" />
          </Field>
          <Field label="Roll number" id="roll-number">
            <Input id="roll-number" value={form.roll_number} onChange={set('roll_number')} className="border-slate-200" />
          </Field>
          <LabeledSelect label="Class section" value={form.class_section_id} onChange={set('class_section_id')}
            options={sections.map((c: { id: string; class_name: string; section: string }) => ({
              value: c.id, label: `${c.class_name} ${c.section}`,
            }))}
            placeholder="Select class" />
        </div>
      </DataSection>

      {/* IDs */}
      <DataSection title="Identification numbers">
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Aadhar no." id="aadhar">
            <Input id="aadhar" value={form.aadhar_no} onChange={set('aadhar_no')} className="border-slate-200" />
          </Field>
          <Field label="APAAR ID" id="apaar">
            <Input id="apaar" value={form.apaar_id} onChange={set('apaar_id')} className="border-slate-200" />
          </Field>
          <Field label="PEN" id="pen">
            <Input id="pen" value={form.pen} onChange={set('pen')} className="border-slate-200" />
          </Field>
          <Field label="CBSE reg. no." id="cbse">
            <Input id="cbse" value={form.cbse_reg_no} onChange={set('cbse_reg_no')} className="border-slate-200" />
          </Field>
          <Field label="SARAL ID" id="saral">
            <Input id="saral" value={form.saral_id} onChange={set('saral_id')} className="border-slate-200" />
          </Field>
          <Field label="Card no." id="card">
            <Input id="card" value={form.card_number} onChange={set('card_number')} className="border-slate-200" />
          </Field>
          <Field label="Ledger no." id="ledger">
            <Input id="ledger" value={form.ledger_no} onChange={set('ledger_no')} className="border-slate-200" />
          </Field>
        </div>
      </DataSection>

      {/* Address */}
      <DataSection title="Address">
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contact-address" className="text-slate-700">Contact address</Label>
            <Input id="contact-address" value={form.contact_address} onChange={set('contact_address')} className="border-slate-200" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="permanent-address" className="text-slate-700">Permanent address</Label>
            <Input id="permanent-address" value={form.permanent_address} onChange={set('permanent_address')} className="border-slate-200" />
          </div>
          <Field label="City / state" id="city-state">
            <Input id="city-state" value={form.city_state} onChange={set('city_state')} className="border-slate-200" />
          </Field>
          <Field label="Pin code" id="pin-code">
            <Input id="pin-code" value={form.pin_code} onChange={set('pin_code')} className="border-slate-200" />
          </Field>
        </div>
      </DataSection>

      {/* Academic */}
      <DataSection title="Academic details">
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <LabeledSelect label="Fee type" value={form.fee_type} onChange={set('fee_type')}
            options={FEE_TYPE_OPTIONS} placeholder="Select fee type" />
          <LabeledSelect label="Student type" value={form.student_type} onChange={set('student_type')}
            options={STUDENT_TYPE_OPTIONS} placeholder="Select type" />
          <LabeledSelect label="Admission type" value={form.admission_type} onChange={set('admission_type')}
            options={ADMISSION_TYPE_OPTIONS} placeholder="Select type" />
          <LabeledSelect label="Hosteller" value={form.hosteller} onChange={set('hosteller')}
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            placeholder="Select" />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="last-school" className="text-slate-700">Previous school</Label>
            <Input id="last-school" value={form.last_school_name} onChange={set('last_school_name')} className="border-slate-200" />
          </div>
        </div>
      </DataSection>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !form.first_name}
      >
        {mutation.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-slate-700">{label}</Label>
      {children}
    </div>
  );
}
