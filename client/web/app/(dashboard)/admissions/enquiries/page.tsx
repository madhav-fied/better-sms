'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEnquiries, createEnquiry } from '@/lib/api/admissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'default', converted: 'secondary', rejected: 'destructive',
};

const EMPTY_FORM = {
  student_name: '', parent_name: '', phone: '', class_seeking: '', notes: '',
};

export default function EnquiriesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', status],
    queryFn: () => getEnquiries({ status: status || undefined, limit: 30 }),
  });
  const items = data?.data ?? [];

  const set = (f: keyof typeof EMPTY_FORM, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const mutation = useMutation({
    mutationFn: createEnquiry,
    onSuccess: () => {
      toast.success('Enquiry created');
      qc.invalidateQueries({ queryKey: ['enquiries'] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to create enquiry');
    },
  });

  const submit = () => {
    if (!form.student_name.trim()) { toast.error('Student name is required'); return; }
    mutation.mutate({
      student_name: form.student_name,
      parent_name: form.parent_name || undefined,
      phone: form.phone || undefined,
      class_seeking: form.class_seeking || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admissions — Enquiries</h1>
        <Button size="sm" onClick={() => setOpen(true)}>New Enquiry</Button>
      </div>
      <select
        className="border rounded px-3 py-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="converted">Converted</option>
        <option value="rejected">Rejected</option>
      </select>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Student Name</th>
              <th className="px-4 py-3 text-left">Parent</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Class Seeking</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : items.map((e: { id: string; student_name: string; parent_name: string; phone: string; class_seeking: string; status: string }) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admissions/enquiries/${e.id}`} className="text-blue-600 hover:underline">{e.student_name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.parent_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.class_seeking ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[e.status] ?? 'secondary'}>{e.status}</Badge>
                    </td>
                  </tr>
                ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No enquiries</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Enquiry</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Student Name <span className="text-red-500">*</span></Label>
              <Input value={form.student_name} onChange={(e) => set('student_name', e.target.value)} placeholder="Student's full name" />
            </div>
            <div className="space-y-1">
              <Label>Parent / Guardian Name</Label>
              <Input value={form.parent_name} onChange={(e) => set('parent_name', e.target.value)} placeholder="Parent's name" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91XXXXXXXXXX" />
            </div>
            <div className="space-y-1">
              <Label>Class Seeking</Label>
              <Input value={form.class_seeking} onChange={(e) => set('class_seeking', e.target.value)} placeholder="e.g. Grade 5" />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
