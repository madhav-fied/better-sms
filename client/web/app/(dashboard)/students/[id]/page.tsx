'use client';

import { useQuery } from '@tanstack/react-query';
import { getStudent } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { ArrowLeft, Pencil } from 'lucide-react';

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

  return (
    <div className="space-y-6">
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

      <section className="max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Profile details</h2>
          <Badge
            variant={s.is_active ? 'default' : 'secondary'}
            className="rounded-md border border-slate-200 px-2.5 py-0.5"
          >
            {s.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <dl className="divide-y divide-slate-200 px-6 py-2">
          <DetailRow label="Roll number" value={s.roll_number} />
          <DetailRow label="Class" value={`${s.class_name} ${s.section}`} />
          {s.phone ? <DetailRow label="Phone" value={s.phone} /> : null}
          {s.dob ? <DetailRow label="Date of birth" value={s.dob} /> : null}
          {s.address ? <DetailRow label="Address" value={s.address} /> : null}
        </dl>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="text-sm leading-relaxed text-slate-900">{value}</dd>
    </div>
  );
}
