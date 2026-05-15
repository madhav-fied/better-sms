'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createNotice } from '@/lib/api/communications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const ALL_ROLES = ['admin', 'teacher', 'staff', 'student', 'parent'];

export default function NewNoticePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [roles, setRoles] = useState<string[]>([...ALL_ROLES]);

  const toggleRole = (r: string) =>
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  const mutation = useMutation({
    mutationFn: () => createNotice({ title, content, target_roles: roles }),
    onSuccess: () => { toast.success('Notice created'); router.push('/communications/notices'); },
    onError: () => toast.error('Failed to create notice'),
  });

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">New Notice</h1>
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Content</Label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Target Roles</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => toggleRole(r)}
                className={`px-2.5 py-1 rounded-full text-xs border capitalize ${roles.includes(r) ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !title || roles.length === 0}>
          {mutation.isPending ? 'Publishing…' : 'Publish Notice'}
        </Button>
      </div>
    </div>
  );
}
