'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { requestOtp, verifyOtp } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';

interface School {
  id: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();

  // OTP flow state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [step, setStep] = useState<'phone' | 'school' | 'otp'>('phone');

  // Superadmin flow state
  const [mode, setMode] = useState<'otp' | 'superadmin'>('otp');
  const [apiKey, setApiKey] = useState('');

  const [loading, setLoading] = useState(false);

  const normalizePhone = (p: string) => {
    const t = p.trim();
    if (t.startsWith('+')) return t;
    if (t.startsWith('91') && t.length === 12) return '+' + t;
    if (t.length === 10 && /^\d+$/.test(t)) return '+91' + t;
    return t;
  };

  // ── OTP helpers ──────────────────────────────────────────────────────────────

  const sendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (normalized !== phone) setPhone(normalized);
    setLoading(true);
    try {
      const res = await requestOtp(normalized, schoolId || undefined);
      if (res.meta?.requires_school_id) {
        const list = (res.meta.schools ?? []).map((s: { school_id: string; school_name: string }) => ({ id: s.school_id, name: s.school_name }));
        setSchools(list);
        setStep('school');
      } else {
        if (res.data?.school_id) setSchoolId(res.data.school_id);
        setStep('otp');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const confirmSchool = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      await requestOtp(normalizePhone(phone), schoolId);
      setStep('otp');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const res = await verifyOtp(normalizePhone(phone), otp, schoolId || undefined);
      const d = res.data;
      setSession({
        token: d.token,
        role: d.role,
        schoolId: d.school_id,
        schoolName: d.school_name ?? null,
        schoolBranchName: d.school_branch_name ?? null,
        userId: d.user_id,
        entityId: d.entity_id,
        expiresAt: d.expires_at,
      });
      router.replace('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Superadmin helper ────────────────────────────────────────────────────────

  const signInAsAdmin = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const d = res.data?.data;
      if (d?.role !== 'superadmin') {
        toast.error('That key does not belong to a superadmin account');
        return;
      }
      storage.setToken(apiKey);
      setSession({
        token: apiKey,
        role: 'superadmin',
        schoolId: null,
        schoolName: null,
        schoolBranchName: null,
        userId: 'superadmin',
        entityId: null,
        expiresAt: null,
      });
      router.replace('/dashboard');
    } catch {
      toast.error('Invalid API key');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: 'otp' | 'superadmin') => {
    setMode(next);
    // reset both flows
    setPhone(''); setOtp(''); setSchoolId(''); setSchools([]); setStep('phone');
    setApiKey('');
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg border p-8 space-y-5">
        <div>
          <h1 className="text-lg font-semibold">SMS Admin</h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'superadmin' ? 'Superadmin sign in' : 'Sign in to your account'}
          </p>
        </div>

        {/* ── Superadmin mode ─────────────────────────────────────────────── */}
        {mode === 'superadmin' && (
          <>
            <div className="space-y-2">
              <Label>API key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Superadmin API key"
                onKeyDown={(e) => e.key === 'Enter' && !loading && apiKey && signInAsAdmin()}
              />
            </div>
            <Button className="w-full" onClick={signInAsAdmin} disabled={loading || !apiKey}>
              {loading ? 'Verifying…' : 'Sign in as Superadmin'}
            </Button>
            <button
              className="w-full text-sm text-gray-400 hover:text-gray-600"
              onClick={() => switchMode('otp')}
            >
              Back to normal login
            </button>
          </>
        )}

        {/* ── OTP mode ────────────────────────────────────────────────────── */}
        {mode === 'otp' && (
          <>
            {(step === 'phone' || step === 'school') && (
              <div className="space-y-2">
                <Label>Phone number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  disabled={step === 'school'}
                />
              </div>
            )}

            {step === 'school' && (
              <div className="space-y-2">
                <Label>Select school</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                >
                  <option value="">— select school —</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <Button className="w-full" onClick={confirmSchool} disabled={loading || !schoolId}>
                  {loading ? 'Sending OTP…' : 'Continue'}
                </Button>
                <button
                  className="w-full text-sm text-gray-400 hover:text-gray-600"
                  onClick={() => { setStep('phone'); setSchools([]); setSchoolId(''); }}
                >
                  Change phone number
                </button>
              </div>
            )}

            {step === 'phone' && (
              <Button className="w-full" onClick={sendOtp} disabled={loading || !phone}>
                {loading ? 'Sending…' : 'Send OTP'}
              </Button>
            )}

            {step === 'otp' && (
              <>
                <div className="space-y-2">
                  <Label>OTP</Label>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                  />
                </div>
                <Button className="w-full" onClick={verify} disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying…' : 'Verify & Login'}
                </Button>
                <button
                  className="w-full text-sm text-gray-400 hover:text-gray-600"
                  onClick={() => { setStep('phone'); setOtp(''); }}
                >
                  Back
                </button>
              </>
            )}

            <div className="pt-1 text-center">
              <button
                className="text-xs text-gray-300 hover:text-gray-500"
                onClick={() => switchMode('superadmin')}
              >
                Superadmin? Sign in with API key
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
