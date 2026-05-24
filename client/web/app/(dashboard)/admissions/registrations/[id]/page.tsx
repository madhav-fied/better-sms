'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegistration, acceptRegistration, rejectRegistration, admitStudent } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import apiClient from '@/lib/api/client';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

type StudentFields = {
  first_name?: string;
  last_name?: string;
  dob?: string;
  sms_mobile?: string;
  email?: string;
};

type Guardian = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  relation: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
};

function studentLabel(sf: StudentFields | null | undefined) {
  if (!sf) return '—';
  return `${sf.first_name ?? ''} ${sf.last_name ?? ''}`.trim() || '—';
}

function guardianName(g: Guardian) {
  return (g.name ?? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim()) || '—';
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
  const sf: StudentFields | null = r?.student_fields ?? null;
  const guardians: Guardian[] = r?.parent_guardians ?? [];

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
        title={studentLabel(sf)}
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

      {/* Student details */}
      <DataSection title="Student details">
        <dl className="divide-y divide-slate-200 px-6">
          <DetailRow label="Submitted" value={r.submitted_at?.split('T')[0] ?? '—'} />
          {sf?.dob && <DetailRow label="Date of birth" value={String(sf.dob)} />}
          {sf?.sms_mobile && <DetailRow label="Mobile" value={sf.sms_mobile} />}
          {sf?.email && <DetailRow label="Email" value={sf.email} />}
        </dl>
      </DataSection>

      {/* Guardians */}
      {guardians.length > 0 && (
        <DataSection title="Parents & Guardians">
          <div className="divide-y divide-slate-200">
            {guardians.map((g, i) => (
              <div key={g.id ?? i} className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{guardianName(g)}</span>
                  <span className="text-xs text-slate-500 capitalize">{g.relation}</span>
                  {g.is_primary && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Primary</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  {g.phone && <span>{g.phone}</span>}
                  {g.email && <span>{g.email}</span>}
                </div>
              </div>
            ))}
          </div>
        </DataSection>
      )}

      {r.status === 'pending' && (
        <div className="flex gap-2">
          <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>Accept</Button>
          <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>Reject</Button>
        </div>
      )}

      {r.status === 'accepted' && (
        <DataSection title="Admit to class">
          <div className="p-6">
            <div className="max-w-sm">
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
            <Button
              className="mt-4"
              onClick={() => admitMutation.mutate()}
              disabled={admitMutation.isPending || !classSectionId}
            >
              Admit student
            </Button>
          </div>
        </DataSection>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}
