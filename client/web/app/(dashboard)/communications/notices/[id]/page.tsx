'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotice, updateNotice } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { use } from 'react';

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notice', id], queryFn: () => getNotice(id) });
  const n = data?.data;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });

  const openEdit = () => {
    if (n) { setForm({ title: n.title ?? '', body: n.body ?? '' }); setEditing(true); }
  };

  const mutation = useMutation({
    mutationFn: () => updateNotice(id, { title: form.title || undefined, body: form.body || undefined }),
    onSuccess: () => {
      toast.success('Notice updated');
      qc.invalidateQueries({ queryKey: ['notice', id] });
      setEditing(false);
    },
    onError: () => toast.error('Failed to update notice'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!n) return <p className="text-gray-400">Notice not found</p>;

  const canEdit = n.status === 'draft';

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{n.title}</h1>
          <p className="text-sm text-gray-400 mt-1">{n.created_at?.split('T')[0]}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant={n.status === 'published' ? 'default' : 'secondary'}>{n.status}</Badge>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" onClick={openEdit}>Edit</Button>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="rounded-lg border bg-white p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {n.body ?? n.content}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Edit Notice</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Body</Label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 leading-relaxed"
              rows={8}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
