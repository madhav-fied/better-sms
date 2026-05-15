'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegistration, acceptRegistration, rejectRegistration } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['registration', id], queryFn: () => getRegistration(id) });
  const r = data?.data;

  const acceptMutation = useMutation({
    mutationFn: () => acceptRegistration(id),
    onSuccess: (res) => {
      toast.success('Student admitted');
      router.push(`/students/${res.data?.student_id}`);
    },
    onError: () => toast.error('Accept failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectRegistration(id, rejectReason),
    onSuccess: () => {
      toast.success('Registration rejected');
      setRejectOpen(false);
      qc.invalidateQueries({ queryKey: ['registration', id] });
    },
    onError: () => toast.error('Reject failed'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!r) return <p className="text-gray-400">Registration not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{r.student_name}</h1>
        <Badge>{r.status}</Badge>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        <Row label="Class" value={r.class_name} />
        <Row label="Phone" value={r.phone} />
        <Row label="Submitted" value={r.created_at?.split('T')[0]} />
      </div>
      {r.status === 'pending' && (
        <div className="flex gap-2">
          <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>Accept</Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
        </div>
      )}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Registration</DialogTitle></DialogHeader>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={3}
            placeholder="Reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending || !rejectReason}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-24 text-gray-400 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}
