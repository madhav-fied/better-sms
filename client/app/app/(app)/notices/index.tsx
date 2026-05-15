import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getNotices } from '../../../lib/api/notices';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function NoticesScreen() {
  const { data, isLoading } = useQuery({ queryKey: ['notices'], queryFn: () => getNotices({ limit: 30 }) });
  const items = data?.data ?? [];

  if (isLoading) return <Spinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Notices</Text>
        {items.length === 0 ? (
          <EmptyState message="No notices" />
        ) : (
          items.map((n: { id: string; title: string; created_at: string; target_roles: string[] }) => (
            <TouchableOpacity key={n.id} onPress={() => router.push(`/(app)/notices/${n.id}` as never)}>
              <Card>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 }}>{n.title}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>{n.created_at?.split('T')[0]}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
