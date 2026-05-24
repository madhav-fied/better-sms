'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaffMember, updateStaff, upsertJobDetail } from '@/lib/api/staff';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Staff } from '@/types/staff';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import EmptyState from '@/components/enterprise/EmptyState';

const sel = 'w-full border border-input rounded-lg px-2.5 py-1.5 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 h-9';

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

const TABS = ['Personal', 'Professional', 'Address', 'Family', 'Job Details'] as const;
type Tab = typeof TABS[number];

function staffToForm(s: Staff) {
  const jd = s.job_detail;
  return {
    first_name: s.first_name ?? '',
    last_name: s.last_name ?? '',
    short_name: s.short_name ?? '',
    gender: s.gender ?? 'male',
    dob: s.dob ?? '',
    email: s.email ?? '',
    mobile: s.mobile ?? s.phone ?? '',
    religion: s.religion ?? '',
    aadhar_no: s.aadhar_no ?? '',
    blood_group: s.blood_group ?? '',
    caste_category: s.caste_category ?? '',
    emergency_mobile: s.emergency_mobile ?? '',
    emp_code: s.emp_code ?? '',
    category: s.category ?? 'teacher',
    designation: s.designation ?? '',
    qualification: s.qualification ?? '',
    teaching_type: s.teaching_type ?? '',
    grade: s.grade ?? '',
    basic_salary: s.basic_salary != null ? String(s.basic_salary) : '',
    total_experience: s.total_experience != null ? String(s.total_experience) : '',
    card_number: s.card_number ?? '',
    relieving_date: s.relieving_date ?? '',
    licensee_number: s.licensee_number ?? '',
    passport_number: s.passport_number ?? '',
    contact_address: s.contact_address ?? '',
    pincode: s.pincode ?? '',
    permanent_address: s.permanent_address ?? '',
    city_state: s.city_state ?? '',
    father_first_name: s.father_first_name ?? '',
    father_last_name: s.father_last_name ?? '',
    mother_first_name: s.mother_first_name ?? '',
    mother_last_name: s.mother_last_name ?? '',
    marital_status: s.marital_status ?? '',
    spouse_name: s.spouse_name ?? '',
    joined_date: jd?.joined_date ?? '',
    end_of_probation: jd?.end_of_probation ?? '',
    position: jd?.position ?? '',
    effective_date: jd?.effective_date ?? '',
    superior: jd?.superior ?? '',
    department: jd?.department ?? '',
    branch: jd?.branch ?? '',
    job_type: jd?.job_type ?? '',
    job_status: jd?.job_status ?? '',
    workdays: jd?.workdays != null ? String(jd.workdays) : '',
    holidays: jd?.holidays != null ? String(jd.holidays) : '',
  };
}

type Form = ReturnType<typeof staffToForm>;

function EditForm({ staffId, s }: { staffId: string; s: Staff }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Personal');
  const [form, setForm] = useState<Form>(staffToForm(s));

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));
  const str = (k: keyof Form) => form[k] as string;

  const mutation = useMutation({
    mutationFn: async () => {
      await updateStaff(staffId, {
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
      if (Object.values(jd).some((v) => v !== undefined)) {
        await upsertJobDetail(staffId, jd);
      }
    },
    onSuccess: () => {
      toast.success('Staff member updated');
      qc.invalidateQueries({ queryKey: ['staff', staffId] });
      qc.invalidateQueries({ queryKey: ['staff'] });
      router.push(`/staff/${staffId}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to update staff');
    },
  });

  const submit = () => {
    if (!form.first_name.trim()) { toast.error('First name is required'); setTab('Personal'); return; }
    if (!form.gender) { toast.error('Gender is required'); setTab('Personal'); return; }
    mutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`Edit staff — ${s.first_name} ${s.last_name ?? ''}`.trim()}
        description={s.emp_code ? `Employee code: ${s.emp_code}` : 'Update personal, professional, and job details.'}
        actions={
          <ActionLink href={`/staff/${staffId}`} variant="outline">
            Back to profile
          </ActionLink>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Tab bar */}
        <div className="flex gap-0 border-b bg-muted/30 overflow-x-auto">
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

        <div className="px-6 py-5 space-y-5">
          {tab === 'Personal' && (
            <>
              <Section title="Identity">
                <div className="grid grid-cols-3 gap-3">
                  <F label="First Name" required>
                    <Input value={str('first_name')} onChange={(e) => set('first_name', e.target.value)} />
                  </F>
                  <F label="Last Name">
                    <Input value={str('last_name')} onChange={(e) => set('last_name', e.target.value)} />
                  </F>
                  <F label="Short Name">
                    <Input value={str('short_name')} onChange={(e) => set('short_name', e.target.value)} />
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
                    <Input type="email" value={str('email')} onChange={(e) => set('email', e.target.value)} />
                  </F>
                  <F label="Mobile Number">
                    <Input value={str('mobile')} onChange={(e) => set('mobile', e.target.value)} />
                  </F>
                  <F label="Emergency Mobile">
                    <Input value={str('emergency_mobile')} onChange={(e) => set('emergency_mobile', e.target.value)} />
                  </F>
                </div>
              </Section>
              <Section title="Government IDs & Health">
                <div className="grid grid-cols-3 gap-3">
                  <F label="Aadhar No">
                    <Input value={str('aadhar_no')} onChange={(e) => set('aadhar_no', e.target.value)} />
                  </F>
                  <F label="Blood Group">
                    <select className={sel} value={str('blood_group')} onChange={(e) => set('blood_group', e.target.value)}>
                      <option value="">— select —</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </F>
                  <F label="Caste Category">
                    <Input value={str('caste_category')} onChange={(e) => set('caste_category', e.target.value)} />
                  </F>
                </div>
              </Section>
            </>
          )}

          {tab === 'Professional' && (
            <>
              <Section title="Role & Classification">
                <div className="grid grid-cols-3 gap-3">
                  <F label="Staff Category" required>
                    <select className={sel} value={str('category')} onChange={(e) => set('category', e.target.value)}>
                      {['teacher','peon','accounts','clerk','electrician','receptionist','security','other'].map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </F>
                  <F label="Designation">
                    <Input value={str('designation')} onChange={(e) => set('designation', e.target.value)} />
                  </F>
                  <F label="Staff Grade">
                    <Input value={str('grade')} onChange={(e) => set('grade', e.target.value)} />
                  </F>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <F label="Teaching Type">
                    <select className={sel} value={str('teaching_type')} onChange={(e) => set('teaching_type', e.target.value)}>
                      <option value="">— select —</option>
                      <option value="regular">Regular</option>
                      <option value="contract">Contract</option>
                      <option value="guest">Guest</option>
                      <option value="part_time">Part Time</option>
                    </select>
                  </F>
                  <F label="Qualification">
                    <Input value={str('qualification')} onChange={(e) => set('qualification', e.target.value)} />
                  </F>
                  <F label="Employee Code">
                    <Input value={str('emp_code')} onChange={(e) => set('emp_code', e.target.value)} />
                  </F>
                </div>
              </Section>
              <Section title="Compensation & Experience">
                <div className="grid grid-cols-3 gap-3">
                  <F label="Basic Salary (₹)">
                    <Input type="number" min="0" value={str('basic_salary')} onChange={(e) => set('basic_salary', e.target.value)} />
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
                    />
                  </F>
                </div>
                <F label="Pincode">
                  <Input value={str('pincode')} onChange={(e) => set('pincode', e.target.value)} />
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
                    />
                  </F>
                </div>
                <F label="City / State">
                  <Input value={str('city_state')} onChange={(e) => set('city_state', e.target.value)} />
                </F>
              </div>
            </Section>
          )}

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
                  <F label="Marital Status">
                    <select className={sel} value={str('marital_status')} onChange={(e) => set('marital_status', e.target.value)}>
                      <option value="">— select —</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </F>
                  <F label="Spouse Name">
                    <Input value={str('spouse_name')} onChange={(e) => set('spouse_name', e.target.value)} />
                  </F>
                </div>
              </Section>
            </>
          )}

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
                    <Input value={str('position')} onChange={(e) => set('position', e.target.value)} />
                  </F>
                  <F label="Superior">
                    <Input value={str('superior')} onChange={(e) => set('superior', e.target.value)} />
                  </F>
                  <F label="Department">
                    <Input value={str('department')} onChange={(e) => set('department', e.target.value)} />
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

        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
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
                <Button variant="outline" size="sm" onClick={() => router.push(`/staff/${staffId}`)}>Cancel</Button>
                <Button size="sm" onClick={submit} disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['staff', id], queryFn: () => getStaffMember(id) });
  const s: Staff | undefined = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!s) {
    return (
      <EmptyState
        title="Staff member not found"
        description="This staff record may have been removed or you may not have access."
        action={<ActionLink href="/staff">Back to staff list</ActionLink>}
      />
    );
  }

  return <EditForm staffId={id} s={s} />;
}
