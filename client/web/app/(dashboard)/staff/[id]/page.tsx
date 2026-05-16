'use client';
import { useQuery } from '@tanstack/react-query';
import { getStaffMember } from '@/lib/api/staff';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { use } from 'react';
import { Staff } from '@/types/staff';

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3">
      <span className="w-36 text-muted-foreground shrink-0 text-xs pt-0.5">{label}</span>
      <span className="text-sm">{value}</span>
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

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['staff', id], queryFn: () => getStaffMember(id) });
  const s: Staff | undefined = data?.data;

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!s) return <p className="text-muted-foreground">Staff member not found</p>;

  const fullName = s.first_name ? `${s.first_name} ${s.last_name ?? ''}`.trim() : (s.name ?? '');
  const isActive = s.status === 'active' || s.is_active;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{fullName}</h1>
        <div className="flex gap-2">
          <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>
          <Link href={`/staff/${id}/edit`} className="text-sm text-blue-600 hover:underline">Edit</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Personal">
          <Row label="Gender" value={s.gender} />
          <Row label="Date of Birth" value={s.dob} />
          <Row label="Religion" value={s.religion} />
          <Row label="Blood Group" value={s.blood_group} />
          <Row label="Aadhar No" value={s.aadhar_no} />
          <Row label="Caste Category" value={s.caste_category} />
        </Card>

        <Card title="Contact">
          <Row label="Email" value={s.email} />
          <Row label="Mobile" value={s.mobile ?? s.phone} />
          <Row label="Emergency Mobile" value={s.emergency_mobile} />
          <Row label="City / State" value={s.city_state} />
          <Row label="Pincode" value={s.pincode} />
        </Card>

        <Card title="Professional">
          <Row label="Emp Code" value={s.emp_code} />
          <Row label="Category" value={s.category ?? s.role} />
          <Row label="Designation" value={s.designation} />
          <Row label="Qualification" value={s.qualification} />
          <Row label="Teaching Type" value={s.teaching_type} />
          <Row label="Grade" value={s.grade} />
          <Row label="Basic Salary" value={s.basic_salary ? `₹${s.basic_salary}` : undefined} />
          <Row label="Experience" value={s.total_experience ? `${s.total_experience} months` : undefined} />
        </Card>

        <Card title="Family">
          <Row label="Father" value={[s.father_first_name, s.father_last_name].filter(Boolean).join(' ') || undefined} />
          <Row label="Mother" value={[s.mother_first_name, s.mother_last_name].filter(Boolean).join(' ') || undefined} />
          <Row label="Marital Status" value={s.marital_status} />
          <Row label="Spouse" value={s.spouse_name} />
        </Card>

        {s.job_detail && (
          <Card title="Job Details">
            <Row label="Joined Date" value={s.job_detail.joined_date} />
            <Row label="End of Probation" value={s.job_detail.end_of_probation} />
            <Row label="Position" value={s.job_detail.position} />
            <Row label="Department" value={s.job_detail.department} />
            <Row label="Branch" value={s.job_detail.branch} />
            <Row label="Job Type" value={s.job_detail.job_type} />
            <Row label="Job Status" value={s.job_detail.job_status} />
            <Row label="Workdays / week" value={s.job_detail.workdays} />
          </Card>
        )}
      </div>
    </div>
  );
}
