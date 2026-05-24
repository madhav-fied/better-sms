'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { passwordLogin, type LoginAccount } from '@/lib/api/auth';
import { sessionFromResponse } from '@/lib/auth-session';
import { storage } from '@/lib/storage';
import type { Role } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type LoginMeta = {
  requires_account_selection?: boolean;
  accounts?: LoginAccount[];
};

type SessionData = {
  token: string;
  role: Role;
  school_id: string | null;
  user_id: string;
  entity_id: string | null;
  expires_at: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loginAccounts, setLoginAccounts] = useState<LoginAccount[]>([]);
  const [step, setStep] = useState<'credentials' | 'account'>('credentials');
  const [loading, setLoading] = useState(false);

  const finishLogin = (data: SessionData) => {
    if (!data?.token) {
      toast.error('Login failed — no session returned');
      return;
    }
    setSession(sessionFromResponse(data));
    if (data.school_id) storage.setActiveSchoolId(data.school_id);
    router.replace(data.role === 'superadmin' ? '/schools' : '/dashboard');
  };

  const handleLogin = async () => {
    const id = identifier.trim();
    if (!id || !password) {
      toast.error('Enter email/phone and password');
      return;
    }
    if (step === 'account' && !selectedUserId) {
      toast.error('Select an account to continue');
      return;
    }

    setLoading(true);
    try {
      const res = await passwordLogin({
        identifier: id,
        password,
        user_id: step === 'account' ? selectedUserId : undefined,
      });

      const meta = res.meta as LoginMeta | undefined;
      if (meta?.requires_account_selection && meta.accounts?.length) {
        setLoginAccounts(meta.accounts);
        setStep('account');
        if (meta.accounts.length === 1) {
          setSelectedUserId(meta.accounts[0].user_id);
        }
        toast.message('Choose an account', {
          description: 'This phone/email is linked to more than one role.',
        });
        return;
      }

      if (!res.data?.token) {
        toast.error(res.error ?? 'Login failed');
        return;
      }

      finishLogin(res.data as SessionData);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string | { msg?: string }[] } } };
      const detail = e.response?.data?.detail;
      const message =
        e.response?.data?.error
        ?? (typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : undefined)
        ?? 'Invalid email/phone or password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 p-4">
      <svg className="pointer-events-none absolute right-0 top-0 h-64 w-64 text-blue-100" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="80" fill="currentColor" opacity="0.4" />
      </svg>
      <svg className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 text-slate-200" viewBox="0 0 160 160" aria-hidden>
        <rect x="20" y="40" width="120" height="80" rx="8" fill="currentColor" opacity="0.5" />
      </svg>
      <div className="relative w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School Management</p>
          <h1 className="text-2xl font-semibold text-slate-900">Edulink</h1>
          <p className="text-sm text-slate-600">
            {step === 'credentials' ? 'Sign in with your email or phone number' : 'Select which account to use'}
          </p>
        </div>

        {step === 'credentials' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="login-identifier" className="text-slate-700">Email or phone</Label>
              <Input
                id="login-identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="email@example.com or 10-digit phone"
                autoComplete="username"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-slate-700">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="current-password"
                className="border-slate-200"
              />
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loading || !identifier.trim() || !password}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </>
        )}

        {step === 'account' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="login-account" className="text-slate-700">Select account</Label>
              <select
                id="login-account"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Choose an account…</option>
                {loginAccounts.map((a) => (
                  <option key={a.user_id} value={a.user_id}>
                    {a.school_name} ({a.role})
                  </option>
                ))}
              </select>
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loading || !selectedUserId}>
              {loading ? 'Signing in…' : 'Continue to dashboard'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep('credentials');
                setLoginAccounts([]);
                setSelectedUserId('');
              }}
            >
              Back to sign in
            </Button>
          </>
        )}

        <p className="text-center text-sm text-slate-600">
          <Link href="/forgot-password" className="font-medium text-slate-900 underline-offset-4 hover:underline">
            Forgot password
          </Link>
        </p>
      </div>
    </div>
  );
}
