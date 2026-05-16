'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegistration, acceptRegistration, rejectRegistration, admitStudent } from '@/lib/api/admissions';
import { getClassSections } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  const [admitOpen, setAdmitOpen] = useState(false);
  const [classSectionId, setClassSectionId] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['registration', id], queryFn: () => getRegistration(id) });
  const r = data?.data;

  const { data: csData } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => getClassSections({ limit: 100 }),
    enabled: admitOpen,
  });
  const classSections: { id: string; name: string; section: string }[] = csData?.data ?? [];

  const acceptMutation = useMutation({
    mutationFn: () => acceptRegistration(id),
    onSuccess: () => {
      toast.success('Registration accepted');
      qc.invalidateQueries({ queryKey: ['registration', id] });
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

  const admitMutation = useMutation({
    mutationFn: () => admitStudent({ registration_id: id, class_section_id: classSectionId }),
    onSuccess: (res) => {
      toast.success('Student admitted');
      router.push(`/students/${res.data?.id}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Admit failed');
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!r) return <p className="text-gray-400">Registration not found</p>;

  const studentName = [r.student_fields?.first_name, r.student_fields?.last_name].filter(Boolean).join(' ') || '—';
  const guardian = r.parent_guardians?.[0];

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{studentName}</h1>
        <Badge>{r.status}</Badge>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        {r.student_fields?.dob && <Row label="Date of Birth" value={r.student_fields.dob} />}
        {guardian && <Row label="Guardian" value={`${guardian.name} (${guardian.relation})`} />}
        {guardian?.mobile && <Row label="Mobile" value={guardian.mobile} />}
        <Row label="Submitted" value={r.submitted_at?.split('T')[0]} />
      </div>

      {r.status === 'pending' && (
        <div className="flex gap-2">
          <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>Accept</Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
        </div>
      )}

      {r.status === 'accepted' && (
        <Button onClick={() => setAdmitOpen(true)}>Admit Student</Button>
      )}

      {/* Reject dialog */}
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

      {/* Admit dialog */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Admit Student</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Class Section <span className="text-red-500">*</span></Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={classSectionId}
                onChange={(e) => setClassSectionId(e.target.value)}
              >
                <option value="">— select class —</option>
                {classSections.map((cs) => (
                  <option key={cs.id} value={cs.id}>{cs.name} {cs.section}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmitOpen(false)} disabled={admitMutation.isPending}>Cancel</Button>
            <Button onClick={() => admitMutation.mutate()} disabled={admitMutation.isPending || !classSectionId}>
              {admitMutation.isPending ? 'Admitting…' : 'Admit'}
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
      <span className="w-28 text-gray-400 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}
