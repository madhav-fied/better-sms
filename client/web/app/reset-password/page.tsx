'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { resetPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import AuthShell from '@/components/layout/AuthShell';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) {
      toast.error('Missing reset token');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success('Password updated');
      router.replace('/login');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.detail ?? 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Set new password"
      subtitle="Choose a strong password for your account."
      footer={
        <p className="text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-slate-700">New password</Label>
          <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-slate-200" />
        </div>
        <Button className="w-full" onClick={submit} disabled={loading || !password || !token}>
          {loading ? 'Saving…' : 'Update password'}
        </Button>
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
