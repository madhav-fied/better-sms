import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { passwordLogin } from '../../lib/api/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoginAccount {
  user_id: string;
  school_name: string;
  role: string;
}

export default function LoginScreen() {
  const { setSession } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [accounts, setAccounts] = useState<LoginAccount[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [step, setStep] = useState<'credentials' | 'account'>('credentials');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    try {
      const res = await passwordLogin({
        identifier: identifier.trim(),
        password,
        user_id: step === 'account' ? selectedUserId : undefined,
      });
      const meta = res.meta as { requires_account_selection?: boolean; accounts?: LoginAccount[] } | undefined;
      if (meta?.requires_account_selection && meta.accounts?.length) {
        setAccounts(meta.accounts);
        setStep('account');
        if (meta.accounts.length === 1) setSelectedUserId(meta.accounts[0].user_id);
        return;
      }
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
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      Alert.alert('Error', e.response?.data?.error ?? e.response?.data?.detail ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>Edulink</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Sign in with your school account</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', gap: 16 }}>
          <Input
            label="Email or phone"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="email@example.com or mobile"
            autoCapitalize="none"
            editable={step === 'credentials'}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />

          {step === 'account' && accounts.length > 0 && (
            <>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>Select account</Text>
              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.user_id}
                  onPress={() => setSelectedUserId(a.user_id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selectedUserId === a.user_id ? '#4f46e5' : '#d1d5db',
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: selectedUserId === a.user_id ? '#eef2ff' : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 14, color: selectedUserId === a.user_id ? '#4f46e5' : '#111827' }}>
                    {a.school_name} ({a.role})
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => { setStep('credentials'); setAccounts([]); setSelectedUserId(''); }}>
                <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}

          <Button
            title={loading ? 'Signing in…' : 'Sign in'}
            loading={loading}
            disabled={!identifier || !password || (step === 'account' && !selectedUserId)}
            onPress={login}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
