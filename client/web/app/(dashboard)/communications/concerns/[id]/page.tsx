'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConcern, replyConcern } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState } from 'react';
import { use } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';
import DataSection from '@/components/enterprise/DataSection';

export default function ConcernDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['concern', id], queryFn: () => getConcern(id) });
  const c = data?.data;
  const messages: { id: string; body: string; sender_type: string; sender_name?: string; created_at: string }[] =
    c?.messages ?? [];

  const replyMutation = useMutation({
    mutationFn: () => replyConcern(id, reply),
    onSuccess: () => {
      toast.success('Reply sent');
      setReply('');
      qc.invalidateQueries({ queryKey: ['concern', id] });
    },
    onError: () => toast.error('Failed to send reply'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!c) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-900">Concern not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={c.subject}
        description={`Category: ${c.category} · ${c.created_at?.split('T')[0]}`}
        actions={
          <>
            <Badge className="rounded-md border border-slate-200 px-2.5 py-0.5 capitalize">{c.status}</Badge>
            <ActionLink href="/communications/concerns" variant="outline">
              Back to concerns
            </ActionLink>
          </>
        }
      />

      <DataSection title="Conversation">
        <div className="space-y-3 p-6">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border p-4 text-sm ${
                m.sender_type === 'parent' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className="mb-1 text-xs text-slate-500 capitalize">
                {m.sender_name ?? m.sender_type} — {m.created_at?.split('T')[0]}
              </p>
              <p className="leading-relaxed text-slate-800">{m.body}</p>
            </div>
          ))}
        </div>
      </DataSection>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="reply" className="text-slate-700">
            Your reply
          </Label>
          <textarea
            id="reply"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
        </div>
        <Button className="mt-4" onClick={() => replyMutation.mutate()} disabled={replyMutation.isPending || !reply}>
          {replyMutation.isPending ? 'Sending…' : 'Send reply'}
        </Button>
      </section>
    </div>
  );
}
