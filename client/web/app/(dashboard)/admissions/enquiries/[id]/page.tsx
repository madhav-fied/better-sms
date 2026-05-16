'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEnquiry, convertEnquiry, updateEnquiry } from '@/lib/api/admissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { use } from 'react';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-36 text-gray-400 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['enquiry', id], queryFn: () => getEnquiry(id) });
  const e = data?.data;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    student_name: '', parent_name: '', phone: '', email: '', class_seeking: '', source: '', notes: '',
  });

  const openEdit = () => {
    if (e) {
      setForm({
        student_name: e.student_name ?? '',
        parent_name: e.parent_name ?? '',
        phone: e.phone ?? '',
        email: e.email ?? '',
        class_seeking: e.class_seeking ?? '',
        source: e.source ?? '',
        notes: e.notes ?? '',
      });
      setEditing(true);
    }
  };

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

  const editMutation = useMutation({
    mutationFn: () => updateEnquiry(id, {
      student_name: form.student_name || undefined,
      parent_name: form.parent_name || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      class_seeking: form.class_seeking || undefined,
      source: form.source || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Enquiry updated');
      qc.invalidateQueries({ queryKey: ['enquiry', id] });
      setEditing(false);
    },
    onError: () => toast.error('Failed to update enquiry'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!e) return <p className="text-gray-400">Enquiry not found</p>;

  const canEdit = e.status !== 'converted' && e.status !== 'rejected';

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{e.student_name}</h1>
        <div className="flex gap-2 items-center">
          <Badge>{e.status}</Badge>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" onClick={openEdit}>Edit</Button>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          {e.parent_name && <Row label="Parent Name" value={e.parent_name} />}
          {e.phone && <Row label="Phone" value={e.phone} />}
          {e.email && <Row label="Email" value={e.email} />}
          {e.class_seeking && <Row label="Class Seeking" value={e.class_seeking} />}
          {e.source && <Row label="Source" value={e.source} />}
          {e.notes && <Row label="Notes" value={e.notes} />}
          <Row label="Enquiry No" value={e.enq_no} />
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Edit Enquiry</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Student Name</Label>
              <Input value={form.student_name} onChange={(e) => setForm((f) => ({ ...f, student_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Parent Name</Label>
              <Input value={form.parent_name} onChange={(e) => setForm((f) => ({ ...f, parent_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Class Seeking</Label>
              <Input value={form.class_seeking} onChange={(e) => setForm((f) => ({ ...f, class_seeking: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
              {editMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {e.status === 'new' && (
        <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
          {convertMutation.isPending ? 'Converting…' : 'Convert to Registration'}
        </Button>
      )}
    </div>
  );
}
