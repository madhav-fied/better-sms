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
    onError: () => toast.error('Conversion failed'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!e) return <p className="text-gray-400">Enquiry not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{e.name}</h1>
        <Badge>{e.status}</Badge>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        <Row label="Phone" value={e.phone} />
        <Row label="Class Interested" value={e.class_interested} />
        <Row label="Date" value={e.created_at?.split('T')[0]} />
        {e.notes && <Row label="Notes" value={e.notes} />}
      </div>
      {e.status === 'visited' && (
        <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
          Convert to Registration
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
