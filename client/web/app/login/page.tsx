'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { requestOtp, verifyOtp } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface School {
  id: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [step, setStep] = useState<'phone' | 'school' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    try {
      await requestOtp(phone, schoolId || undefined);
      setStep('otp');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { data?: { schools?: School[] }; error?: string } } };
      if (e.response?.status === 409) {
        const list = e.response.data?.data?.schools ?? [];
        setSchools(list);
        setStep('school');
      } else {
        toast.error(e.response?.data?.error ?? 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmSchool = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      await requestOtp(phone, schoolId);
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
      const res = await verifyOtp(phone, otp, schoolId);
      const d = res.data;
      setSession({
        token: d.token,
        role: d.role,
        schoolId: d.school_id,
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg border p-8 space-y-5">
        <div>
          <h1 className="text-lg font-semibold">SMS Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your account</p>
        </div>

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
      </div>
    </div>
  );
}
