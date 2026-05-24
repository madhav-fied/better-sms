'use client';

import Link from 'next/link';
import { useState } from 'react';
import { forgotPassword, type LoginAccount } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import AuthShell from '@/components/layout/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [accounts, setAccounts] = useState<LoginAccount[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const submit = async () => {
    setLoading(true);
    try {
      const res = await forgotPassword({ email, user_id: selectedUserId || undefined });
      const meta = res.meta as { requires_account_selection?: boolean; accounts?: LoginAccount[] } | undefined;
      if (meta?.requires_account_selection && meta.accounts?.length) {
        setAccounts(meta.accounts);
        return;
      }
      setSent(true);
      toast.success('Check your email for a reset link');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.detail ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we will send you a reset link."
      footer={
        <p className="text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <p className="text-sm leading-relaxed text-slate-600">
          If an account exists for that email, a reset link has been sent. Check your inbox or contact your administrator.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="text-slate-700">Email address</Label>
            <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-slate-200" />
          </div>
          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="forgot-account" className="text-slate-700">Select account</Label>
              <select
                id="forgot-account"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Choose an account…</option>
                {accounts.map((a) => (
                  <option key={a.user_id} value={a.user_id}>{a.school_name} ({a.role})</option>
                ))}
              </select>
            </div>
          )}
          <Button className="w-full" onClick={submit} disabled={loading || !email || (accounts.length > 0 && !selectedUserId)}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
