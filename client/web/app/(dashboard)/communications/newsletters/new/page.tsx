'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createNewsletter } from '@/lib/api/communications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';

export default function NewNewsletterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', issue_label: '', body: '', published_date: '' });

  const mutation = useMutation({
    mutationFn: () => createNewsletter({
      title: form.title,
      issue_label: form.issue_label || undefined,
      body: form.body || undefined,
      published_date: form.published_date || undefined,
    }),
    onSuccess: () => {
      toast.success('Newsletter created');
      router.push('/communications/newsletters');
    },
    onError: () => toast.error('Failed to create newsletter'),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="New newsletter"
        description="Publish a school newsletter for parents and staff."
        actions={<ActionLink href="/communications/newsletters" variant="outline">Back to newsletters</ActionLink>}
      />
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nl-title" className="text-slate-700">Title</Label>
          <Input id="nl-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-issue" className="text-slate-700">Issue label</Label>
          <Input id="nl-issue" placeholder="March 2026" value={form.issue_label} onChange={(e) => setForm((f) => ({ ...f, issue_label: e.target.value }))} className="border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-date" className="text-slate-700">Published date</Label>
          <Input id="nl-date" type="date" value={form.published_date} onChange={(e) => setForm((f) => ({ ...f, published_date: e.target.value }))} className="border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-body" className="text-slate-700">Content</Label>
          <textarea id="nl-body" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm min-h-[120px]" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title}>
          {mutation.isPending ? 'Creating…' : 'Create newsletter'}
        </Button>
      </section>
    </div>
  );
}
