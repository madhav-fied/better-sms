'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createNotice } from '@/lib/api/communications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';

const ALL_ROLES = ['admin', 'teacher', 'staff', 'student', 'parent'];

export default function NewNoticePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [roles, setRoles] = useState<string[]>([...ALL_ROLES]);

  const toggleRole = (r: string) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const mutation = useMutation({
    mutationFn: () => createNotice({ title, content, target_roles: roles }),
    onSuccess: () => {
      toast.success('Notice created');
      router.push('/communications/notices');
    },
    onError: () => toast.error('Failed to create notice'),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="New notice"
        description="Publish a notice to selected roles in your school."
        actions={
          <ActionLink href="/communications/notices" variant="outline">
            Back to notices
          </ActionLink>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-slate-700">
              Title
            </Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content" className="text-slate-700">
              Content
            </Label>
            <textarea
              id="content"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Target roles</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={roles.includes(r) ? 'default' : 'outline'}
                  onClick={() => toggleRole(r)}
                  className="capitalize"
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <Button className="mt-6" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title || roles.length === 0}>
          {mutation.isPending ? 'Publishing…' : 'Publish notice'}
        </Button>
      </section>
    </div>
  );
}
