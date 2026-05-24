'use client';

import { useQuery } from '@tanstack/react-query';
import { getStudent } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import { ArrowLeft, Pencil } from 'lucide-react';
import type { ParentGuardian } from '@/types/student';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const s = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!s) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-medium text-slate-900">Student not found</p>
        <p className="mt-2 text-sm text-slate-600">This student may have been removed or you may not have access.</p>
        <Link href="/students" className={buttonVariants({ variant: 'outline', className: 'mt-4' })}>
          <ArrowLeft aria-hidden />
          Back to students
        </Link>
      </div>
    );
  }

  const guardians: ParentGuardian[] = s.parent_guardians ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={s.name}
        description="Student profile and enrollment details."
        actions={
          <>
            <Link href="/students" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft aria-hidden />
              Back to list
            </Link>
            <Link href={`/students/${id}/edit`} className={buttonVariants({ variant: 'outline' })}>
              <Pencil aria-hidden />
              Edit student
            </Link>
          </>
        }
      />

      {/* Profile */}
      <DataSection
        title="Profile"
        actions={
          <Badge
            variant={s.is_active ? 'default' : 'secondary'}
            className="rounded-md border border-slate-200 px-2.5 py-0.5"
          >
            {s.is_active ? 'Active' : 'Inactive'}
          </Badge>
        }
      >
        <dl className="divide-y divide-slate-200 px-6 py-2">
          {s.gender && <DetailRow label="Gender" value={s.gender} />}
          {s.dob && <DetailRow label="Date of birth" value={s.dob} />}
          {s.blood_group && <DetailRow label="Blood group" value={s.blood_group} />}
          {s.phone && <DetailRow label="Phone" value={s.phone} />}
          {s.whatsapp_mobile && <DetailRow label="WhatsApp" value={s.whatsapp_mobile} />}
          {s.email && <DetailRow label="Email" value={s.email} />}
          {s.admission_type && <DetailRow label="Admission type" value={s.admission_type} />}
          {s.fee_type && <DetailRow label="Fee type" value={s.fee_type} />}
          {typeof s.hosteller === 'boolean' && <DetailRow label="Hosteller" value={s.hosteller ? 'Yes' : 'No'} />}
          {s.last_school_name && <DetailRow label="Previous school" value={s.last_school_name} />}
        </dl>
      </DataSection>

      {/* IDs & Documents */}
      <DataSection title="IDs & Documents">
        <dl className="divide-y divide-slate-200 px-6 py-2">
          {s.full_student_uid && <DetailRow label="Login ID" value={s.full_student_uid} />}
          <DetailRow label="Admission no." value={s.admission_no} />
          {s.roll_number && <DetailRow label="Roll number" value={s.roll_number} />}
          {s.apaar_id && <DetailRow label="APAAR ID" value={s.apaar_id} />}
          {s.aadhar_no && <DetailRow label="Aadhar no." value={s.aadhar_no} />}
          {s.cbse_reg_no && <DetailRow label="CBSE reg. no." value={s.cbse_reg_no} />}
          {s.pen && <DetailRow label="PEN" value={s.pen} />}
          {s.saral_id && <DetailRow label="SARAL ID" value={s.saral_id} />}
          {s.card_number && <DetailRow label="Card no." value={s.card_number} />}
          {s.ledger_no && <DetailRow label="Ledger no." value={s.ledger_no} />}
        </dl>
      </DataSection>

      {/* Address */}
      {(s.contact_address || s.permanent_address || s.city_state || s.pin_code) && (
        <DataSection title="Address">
          <dl className="divide-y divide-slate-200 px-6 py-2">
            {s.contact_address && <DetailRow label="Contact address" value={s.contact_address} />}
            {s.permanent_address && <DetailRow label="Permanent address" value={s.permanent_address} />}
            {s.city_state && <DetailRow label="City / state" value={s.city_state} />}
            {s.pin_code && <DetailRow label="Pin code" value={s.pin_code} />}
          </dl>
        </DataSection>
      )}

      {/* Parents & Guardians */}
      {guardians.length > 0 && (
        <DataSection title="Parents & Guardians">
          <div className="divide-y divide-slate-200">
            {guardians.map((g) => (
              <div key={g.id} className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{g.name ?? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim()}</span>
                  <span className="text-xs text-slate-500 capitalize">{g.relation}</span>
                  {g.is_primary && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Primary</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  {g.phone && <span>{g.phone}</span>}
                  {g.email && <span>{g.email}</span>}
                  {g.occupation && <span>{g.occupation}</span>}
                </div>
              </div>
            ))}
          </div>
        </DataSection>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm leading-relaxed text-slate-900">{value}</dd>
    </div>
  );
}
