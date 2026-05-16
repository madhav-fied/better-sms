'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSyllabusById, updateSyllabus } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { use } from 'react';

export default function SyllabusDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['syllabus', id], queryFn: () => getSyllabusById(id) });
  const s = data?.data;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', topics: '' });

  const openEdit = () => {
    if (s) {
      setForm({
        title: s.title ?? '',
        description: s.description ?? '',
        topics: Array.isArray(s.topics) ? s.topics.join(', ') : (s.topics ?? ''),
      });
      setEditing(true);
    }
  };

  const mutation = useMutation({
    mutationFn: () => updateSyllabus(id, {
      title: form.title || undefined,
      description: form.description || undefined,
      topics: form.topics ? form.topics.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    }),
    onSuccess: () => {
      toast.success('Syllabus updated');
      qc.invalidateQueries({ queryKey: ['syllabus', id] });
      setEditing(false);
    },
    onError: () => toast.error('Failed to update syllabus'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!s) return <p className="text-gray-400">Syllabus not found</p>;

  const canEdit = s.status === 'draft';

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{s.title ?? `${s.subject} — ${s.class_section_id}`}</h1>
          <p className="text-sm text-gray-400 mt-1">{s.subject} · v{s.version} · {s.created_at?.split('T')[0]}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant={s.status === 'published' ? 'default' : 'secondary'}>{s.status}</Badge>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" onClick={openEdit}>Edit</Button>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="rounded-lg border bg-white p-5 space-y-3 text-sm text-gray-700">
          {s.description && <p className="whitespace-pre-wrap leading-relaxed">{s.description}</p>}
          {s.topics && s.topics.length > 0 && (
            <div>
              <p className="text-xs uppercase text-gray-400 font-medium mb-1">Topics</p>
              <ul className="list-disc list-inside space-y-1">
                {(Array.isArray(s.topics) ? s.topics : [s.topics]).map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Edit Syllabus</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 leading-relaxed"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Topics (comma-separated)</Label>
            <Input value={form.topics} onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))} placeholder="Topic 1, Topic 2, Topic 3" />
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
