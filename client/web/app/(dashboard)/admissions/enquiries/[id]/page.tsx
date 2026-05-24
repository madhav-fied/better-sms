'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { getEnquiry, convertEnquiry } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useActiveAY } from '@/hooks/useActiveAY';
import { ENQUIRY_STATUS_LABEL } from '@/lib/mappers';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';

export default function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: activeAy } = useActiveAY();
  const { data, isLoading } = useQuery({ queryKey: ['enquiry', id], queryFn: () => getEnquiry(id) });
  const e = data?.data;

  const convertMutation = useMutation({
    mutationFn: () => {
      if (!activeAy?.id) throw new Error('No active academic year');
      return convertEnquiry(id, { academic_year_id: activeAy.id });
    },
    onSuccess: (res) => {
      toast.success('Converted to registration');
      router.push(`/admissions/registrations/${res.data?.id}`);
    },
    onError: () => toast.error('Conversion failed — set an active academic year in Settings'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!e) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Enquiry not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title={e.student_name}
        description="Admission enquiry details."
        actions={
          <>
            <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5">
              {ENQUIRY_STATUS_LABEL[e.status] ?? e.status}
            </Badge>
            <ActionLink href="/admissions/enquiries" variant="outline">
              Back to enquiries
            </ActionLink>
          </>
        }
      />

      <DataSection title="Enquiry details">
        <dl className="divide-y divide-slate-200 px-6">
          <DetailRow label="Enquiry no" value={e.enq_no} />
          <DetailRow label="Parent" value={e.parent_name} />
          <DetailRow label="Mobile" value={e.mobile} />
          <DetailRow label="Date" value={e.date} />
          {e.notes && <DetailRow label="Notes" value={e.notes} />}
        </dl>
      </DataSection>

      {e.status === 'open' && (
        <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
          Convert to registration
        </Button>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}
