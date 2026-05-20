import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { getNotice } from '../../../lib/api/notices';
import { Spinner } from '../../../components/ui/Spinner';

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useQuery({ queryKey: ['notice', id], queryFn: () => getNotice(id) });
  const notice = data?.data;

  if (isLoading) return <Spinner />;
  if (!notice) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>Notice not found</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>← Back</Text>
        </TouchableOpacity>

        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{notice.title}</Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
            {notice.published_at?.split('T')[0] ?? notice.created_at?.split('T')[0]}
            {notice.target_type === 'school_wide' ? ' · School Wide' : ''}
          </Text>
          {notice.body ? (
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 22 }}>{notice.body}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
