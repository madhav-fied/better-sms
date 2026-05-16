import { ScrollView, View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getExams } from '../../../lib/api/exams';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ExamsScreen() {
  const { data, isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => getExams() });
  const items = data?.data ?? [];

  if (isLoading) return <Spinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Exams</Text>
        {items.length === 0 ? (
          <EmptyState message="No exams" />
        ) : (
          items.map((e: { id: string; name: string; start_date: string; end_date: string; status: string }) => (
            <Card key={e.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{e.name}</Text>
                <Badge label={e.status} variant={e.status === 'published' ? 'success' : 'secondary'} />
              </View>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{e.start_date} — {e.end_date}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
