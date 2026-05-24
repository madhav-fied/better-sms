'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegistration, acceptRegistration, rejectRegistration, admitStudent } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

function studentLabel(sf: { first_name?: string; last_name?: string } | null | undefined) {
  if (!sf) return '—';
  return `${sf.first_name ?? ''} ${sf.last_name ?? ''}`.trim() || '—';
}

export default function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [classSectionId, setClassSectionId] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['registration', id], queryFn: () => getRegistration(id) });
  const { data: sections } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => apiClient.get('/class-sections').then((r) => r.data?.data ?? []),
  });
  const r = data?.data;

  const acceptMutation = useMutation({
    mutationFn: () => acceptRegistration(id),
    onSuccess: () => {
      toast.success('Registration accepted — assign a class to admit the student');
      qc.invalidateQueries({ queryKey: ['registration', id] });
    },
    onError: () => toast.error('Accept failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectRegistration(id),
    onSuccess: () => {
      toast.success('Registration rejected');
      setRejectOpen(false);
      qc.invalidateQueries({ queryKey: ['registration', id] });
    },
    onError: () => toast.error('Reject failed'),
  });

  const admitMutation = useMutation({
    mutationFn: () =>
      admitStudent({
        registration_id: id,
        class_section_id: classSectionId,
        student_type: 'new',
        hosteller: false,
        admission_type: 'regular',
      }),
    onSuccess: (res) => {
      toast.success('Student admitted');
      router.push(`/students/${res.data?.id}`);
    },
    onError: () => toast.error('Admit failed'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!r) return <p className="text-gray-400">Registration not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{studentLabel(r.student_fields)}</h1>
        <Badge>{r.status}</Badge>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        <Row label="Submitted" value={r.submitted_at?.split('T')[0] ?? '—'} />
        {r.parent_guardians?.map((g: { name: string; relation: string; mobile?: string }, i: number) => (
          <Row key={i} label={`Guardian (${g.relation})`} value={`${g.name}${g.mobile ? ` · ${g.mobile}` : ''}`} />
        ))}
      </div>
      {r.status === 'pending' && (
        <div className="flex gap-2">
          <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>Accept</Button>
          <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
            Reject
          </Button>
        </div>
      )}
      {r.status === 'accepted' && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h2 className="text-sm font-medium">Admit to class</h2>
          <div className="space-y-1.5">
            <Label>Class section</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={classSectionId}
              onChange={(e) => setClassSectionId(e.target.value)}
            >
              <option value="">— select —</option>
              {(sections ?? []).map((cs: { id: string; class_name: string; section: string }) => (
                <option key={cs.id} value={cs.id}>{cs.class_name} {cs.section}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => admitMutation.mutate()} disabled={admitMutation.isPending || !classSectionId}>
            Admit Student
          </Button>
        </div>
      )}
      <Link href="/admissions/registrations" className="text-sm text-blue-600 hover:underline block">
        ← Back to registrations
      </Link>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject registration?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-32 text-gray-400 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}
