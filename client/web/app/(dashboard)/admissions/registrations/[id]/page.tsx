'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegistration, acceptRegistration, rejectRegistration, admitStudent } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import apiClient from '@/lib/api/client';
import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

function studentLabel(sf: { first_name?: string; last_name?: string } | null | undefined) {
  if (!sf) return '—';
  return `${sf.first_name ?? ''} ${sf.last_name ?? ''}`.trim() || '—';
}

export default function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
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

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!r) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Registration not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title={studentLabel(r.student_fields)}
        description="Registration review and admission."
        actions={
          <>
            <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize">{r.status}</Badge>
            <ActionLink href="/admissions/registrations" variant="outline">
              Back to registrations
            </ActionLink>
          </>
        }
      />

      <DataSection title="Registration details">
        <dl className="divide-y divide-slate-200 px-6">
          <DetailRow label="Submitted" value={r.submitted_at?.split('T')[0] ?? '—'} />
          {r.parent_guardians?.map((g: { name: string; relation: string; mobile?: string }, i: number) => (
            <DetailRow key={i} label={`Guardian (${g.relation})`} value={`${g.name}${g.mobile ? ` · ${g.mobile}` : ''}`} />
          ))}
        </dl>
      </DataSection>

      {r.status === 'pending' && (
        <div className="flex gap-2">
          <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
            Accept
          </Button>
          <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
            Reject
          </Button>
        </div>
      )}

      {r.status === 'accepted' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Admit to class</h2>
          <div className="mt-4 max-w-sm">
            <LabeledSelect
              label="Class section"
              value={classSectionId}
              onChange={(e) => setClassSectionId(e.target.value)}
              options={(sections ?? []).map((cs: { id: string; class_name: string; section: string }) => ({
                value: cs.id,
                label: `${cs.class_name} ${cs.section}`,
              }))}
              placeholder="Select class"
            />
          </div>
          <Button className="mt-4" onClick={() => admitMutation.mutate()} disabled={admitMutation.isPending || !classSectionId}>
            Admit student
          </Button>
        </section>
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
