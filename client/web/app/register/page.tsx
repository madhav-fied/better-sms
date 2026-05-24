'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { register } from '@/lib/api/auth';
import { sessionFromResponse } from '@/lib/auth-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import AuthShell from '@/components/layout/AuthShell';
import LabeledSelect from '@/components/enterprise/LabeledSelect';

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await register({ email, phone, password, role });
      setSession(sessionFromResponse(res.data));
      toast.success('Account created');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.detail ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Register a new user account for your school."
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
          <Label htmlFor="reg-email" className="text-slate-700">Email</Label>
          <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-phone" className="text-slate-700">Phone</Label>
          <Input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" className="border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-password" className="text-slate-700">Password</Label>
          <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-slate-200" />
        </div>
        <LabeledSelect
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Select role"
          options={[
            { value: 'admin', label: 'Admin' },
            { value: 'teacher', label: 'Teacher' },
            { value: 'staff', label: 'Staff' },
            { value: 'parent', label: 'Parent' },
          ]}
        />
        <Button className="w-full" onClick={submit} disabled={loading || !email || !phone || !password}>
          {loading ? 'Creating…' : 'Create account'}
        </Button>
      </div>
    </AuthShell>
  );
}
