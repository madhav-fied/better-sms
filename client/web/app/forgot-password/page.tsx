'use client';

import Link from 'next/link';
import { useState } from 'react';
import { forgotPassword, type LoginAccount } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [accounts, setAccounts] = useState<LoginAccount[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const submit = async () => {
    setLoading(true);
    try {
      const res = await forgotPassword({
        email,
        user_id: selectedUserId || undefined,
      });
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg border p-8 space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Forgot password</h1>
          <p className="text-sm text-gray-400 mt-1">We will email you a reset link</p>
        </div>
        {sent ? (
          <p className="text-sm text-gray-600">
            If an account exists for that email, a reset link has been sent. In dev mode, check Railway logs for the link.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label>Select account</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">— select account —</option>
                  {accounts.map((a) => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.school_name} ({a.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              className="w-full"
              onClick={submit}
              disabled={loading || !email || (accounts.length > 0 && !selectedUserId)}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        )}
        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
