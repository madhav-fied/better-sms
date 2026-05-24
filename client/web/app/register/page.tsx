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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg border p-8 space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Edulink</h1>
          <p className="text-sm text-gray-400 mt-1">Create your account · phone required</p>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
            <option value="parent">Parent</option>
          </select>
        </div>
        <Button className="w-full" onClick={submit} disabled={loading || !email || !phone || !password}>
          {loading ? 'Creating…' : 'Register'}
        </Button>
        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
