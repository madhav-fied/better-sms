'use client';

import { useQuery } from '@tanstack/react-query';
import { getStaffMember } from '@/lib/api/staff';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['staff', id], queryFn: () => getStaffMember(id) });
  const s = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!s) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Staff member not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title={s.name}
        description="Staff profile and role details."
        actions={
          <>
            <Badge
              variant={s.is_active ? 'default' : 'secondary'}
              className="rounded-md border border-slate-200 px-2.5 py-0.5"
            >
              {s.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <ActionLink href={`/staff/${id}/edit`}>Edit profile</ActionLink>
            <ActionLink href="/staff" variant="outline">
              Back to staff
            </ActionLink>
          </>
        }
      />

      <DataSection title="Contact & role">
        <dl className="divide-y divide-slate-200 px-6">
          <DetailRow label="Phone" value={s.phone ?? s.mobile} />
          <DetailRow label="Role" value={s.role ?? s.category} />
          {s.email && <DetailRow label="Email" value={s.email} />}
          {s.designation && <DetailRow label="Designation" value={s.designation} />}
          {s.subjects?.length > 0 && <DetailRow label="Subjects" value={s.subjects.join(', ')} />}
        </dl>
      </DataSection>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="text-sm capitalize text-slate-900">{value}</dd>
    </div>
  );
}
