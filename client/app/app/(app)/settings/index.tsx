import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { useRole } from '../../../hooks/useRole';
import { ROLE_LABELS } from '../../../constants/roles';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function SettingsScreen() {
  const { clearSession, userId, role, schoolId } = useAuthStore();
  const { role: userRole } = useRole();

  const handleLogout = async () => {
    await clearSession();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Profile & Settings</Text>
        <Card style={{ gap: 8 }}>
          <Row label="Role" value={userRole ? ROLE_LABELS[userRole] : '—'} />
          <Row label="User ID" value={userId ?? '—'} />
          {schoolId && <Row label="School ID" value={schoolId} />}
        </Card>
        <Card>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4 }}>API</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>{process.env.EXPO_PUBLIC_API_URL}</Text>
        </Card>
        <Button title="Logout" variant="danger" onPress={handleLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: '#111827' }}>{value}</Text>
    </View>
  );
}
