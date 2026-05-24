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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg border p-8 space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Edulink</h1>
          <p className="text-sm text-gray-400 mt-1">
            {step === 'credentials' ? 'Sign in to your account' : 'Select which account to use'}
          </p>
        </div>

        {step === 'credentials' && (
          <>
            <div className="space-y-2">
              <Label>Email or phone</Label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="email@example.com or 10-digit phone"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="current-password"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={loading || !identifier.trim() || !password}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </>
        )}

        {step === 'account' && (
          <>
            <div className="space-y-2">
              <Label>Select account</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">— select account —</option>
                {loginAccounts.map((a) => (
                  <option key={a.user_id} value={a.user_id}>
                    {a.school_name} ({a.role})
                  </option>
                ))}
              </select>
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loading || !selectedUserId}>
              {loading ? 'Signing in…' : 'Continue'}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-gray-400 hover:text-gray-600"
              onClick={() => {
                setStep('credentials');
                setLoginAccounts([]);
                setSelectedUserId('');
              }}
            >
              Back
            </button>
          </>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link href="/forgot-password" className="underline">
            Forgot password?
          </Link>
          {' · '}
          <Link href="/register" className="underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
