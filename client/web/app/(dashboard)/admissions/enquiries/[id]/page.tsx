'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getEnquiry, convertEnquiry } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['enquiry', id], queryFn: () => getEnquiry(id) });
  const e = data?.data;

  const convertMutation = useMutation({
    mutationFn: () => convertEnquiry(id),
    onSuccess: (res) => {
      toast.success('Converted to registration');
      router.push(`/admissions/registrations/${res.data?.id}`);
    },
    onError: (err: unknown) => {
      const ex = err as { response?: { data?: { error?: string } } };
      toast.error(ex.response?.data?.error ?? 'Conversion failed');
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!e) return <p className="text-gray-400">Enquiry not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{e.student_name}</h1>
        <Badge>{e.status}</Badge>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        {e.parent_name && <Row label="Parent Name" value={e.parent_name} />}
        {e.phone && <Row label="Phone" value={e.phone} />}
        {e.email && <Row label="Email" value={e.email} />}
        {e.class_seeking && <Row label="Class Seeking" value={e.class_seeking} />}
        {e.source && <Row label="Source" value={e.source} />}
        {e.notes && <Row label="Notes" value={e.notes} />}
        <Row label="Enquiry No" value={e.enq_no} />
      </div>
      {e.status === 'new' && (
        <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
          {convertMutation.isPending ? 'Converting…' : 'Convert to Registration'}
        </Button>
      )}
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
