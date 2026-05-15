'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConcern, replyConcern } from '@/lib/api/communications';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { use } from 'react';

export default function ConcernDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['concern', id], queryFn: () => getConcern(id) });
  const c = data?.data;

  const replyMutation = useMutation({
    mutationFn: () => replyConcern(id, reply),
    onSuccess: () => {
      toast.success('Reply sent');
      setReply('');
      qc.invalidateQueries({ queryKey: ['concern', id] });
    },
    onError: () => toast.error('Failed to send reply'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!c) return <p className="text-gray-400">Concern not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{c.subject}</h1>
        <Badge variant={c.status === 'resolved' ? 'secondary' : 'default'}>{c.status}</Badge>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="text-sm bg-blue-50 rounded p-3">
          <p className="text-xs text-gray-400 mb-1">Original — {c.created_at?.split('T')[0]}</p>
          <p>{c.message}</p>
        </div>
        {(c.replies ?? []).map((r: { id: string; message: string; created_by_role: string; created_at: string }) => (
          <div key={r.id} className="text-sm bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-400 mb-1 capitalize">{r.created_by_role} — {r.created_at?.split('T')[0]}</p>
            <p>{r.message}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <textarea
          className="w-full border rounded px-3 py-2 text-sm"
          rows={3}
          placeholder="Write a reply…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <Button onClick={() => replyMutation.mutate()} disabled={replyMutation.isPending || !reply}>
          {replyMutation.isPending ? 'Sending…' : 'Send Reply'}
        </Button>
      </div>
    </div>
  );
}
