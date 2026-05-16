'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudent, updateStudent } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { use } from 'react';
import { toast } from 'sonner';
import { Student } from '@/types/student';

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

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const s: Student | undefined = data?.data;

  const toggleStatus = useMutation({
    mutationFn: () => updateStudent(id, { status: s?.status === 'active' ? 'inactive' : 'active' }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['student', id] });
    },
    onError: () => toast.error('Failed to update status'),
  });

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
    </div>
  );
}
