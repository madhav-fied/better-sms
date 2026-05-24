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
import Link from 'next/link';

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

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!e) return <p className="text-gray-400">Enquiry not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{e.student_name}</h1>
        <Badge>{ENQUIRY_STATUS_LABEL[e.status] ?? e.status}</Badge>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        <Row label="Enquiry No" value={e.enq_no} />
        <Row label="Parent" value={e.parent_name} />
        <Row label="Mobile" value={e.mobile} />
        <Row label="Date" value={e.date} />
        {e.notes && <Row label="Notes" value={e.notes} />}
      </div>
      {e.status === 'open' && (
        <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
          Convert to Registration
        </Button>
      )}
      <Link href="/admissions/enquiries" className="text-sm text-blue-600 hover:underline block">
        ← Back to enquiries
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-36 text-gray-400 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}
