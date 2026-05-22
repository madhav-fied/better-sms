import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { requestOtp, verifyOtp } from '../../lib/api/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

interface School { id: string; name: string }

export default function LoginScreen() {
  const { setSession } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [step, setStep] = useState<'phone' | 'school' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const normalizePhone = (p: string) => {
    const t = p.trim();
    if (t.startsWith('+')) return t;
    if (t.startsWith('91') && t.length === 12) return '+' + t;
    if (t.length === 10 && /^\d+$/.test(t)) return '+91' + t;
    return t;
  };

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
      Alert.alert('Error', e.response?.data?.error ?? 'Failed to send OTP');
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
      Alert.alert('Error', e.response?.data?.error ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const res = await verifyOtp(normalizePhone(phone), otp, schoolId || undefined);
      const d = res.data;
      await setSession({
        token: d.token,
        role: d.role,
        schoolId: d.school_id,
        schoolName: d.school_name ?? null,
        schoolBranchName: d.school_branch_name ?? null,
        userId: d.user_id,
        entityId: d.entity_id,
        expiresAt: d.expires_at,
      });
      router.replace('/(app)/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      Alert.alert('Error', e.response?.data?.error ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>SKEducations</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Sign in to continue</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', gap: 16 }}>
          {step !== 'otp' && (
            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91XXXXXXXXXX"
              keyboardType="phone-pad"
              editable={step === 'phone'}
            />
          )}

          {step === 'school' && (
            <>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Select School</Text>
              {schools.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSchoolId(s.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: schoolId === s.id ? '#4f46e5' : '#d1d5db',
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: schoolId === s.id ? '#eef2ff' : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 14, color: schoolId === s.id ? '#4f46e5' : '#111827' }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
              <Button
                title={loading ? 'Sending OTP…' : 'Continue'}
                loading={loading}
                disabled={!schoolId}
                onPress={confirmSchool}
              />
              <TouchableOpacity onPress={() => { setStep('phone'); setSchools([]); setSchoolId(''); }}>
                <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'phone' && (
            <Button title={loading ? 'Sending…' : 'Send OTP'} loading={loading} disabled={!phone} onPress={sendOtp} />
          )}

          {step === 'otp' && (
            <>
              <Input
                label="OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit code"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button
                title={loading ? 'Verifying…' : 'Verify & Login'}
                loading={loading}
                disabled={otp.length !== 6}
                onPress={verify}
              />
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); }}>
                <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
