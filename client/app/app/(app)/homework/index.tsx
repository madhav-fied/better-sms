import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRole } from '../../../hooks/useRole';
import { useParentChildStore } from '../../../store/parentChild';
import { getHomework } from '../../../lib/api/homework';
import { Card } from '../../../components/ui/Card';
import { ChildSelector } from '../../../components/ChildSelector';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function HomeworkScreen() {
  const { role } = useRole();
  const { selectedChild } = useParentChildStore();
  const isParent = role === 'parent';

  const params: Record<string, unknown> = { limit: 20 };
  if (isParent && selectedChild?.class_section_id) {
    params.class_section_id = selectedChild.class_section_id;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['homework', isParent ? selectedChild?.class_section_id : 'all'],
    queryFn: () => getHomework(params),
  });
  const items = data?.data ?? [];

  if (isLoading) return <Spinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {isParent && <ChildSelector />}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Homework</Text>
        {items.length === 0 ? (
          <EmptyState message="No homework assigned" />
        ) : (
          items.map((h: { id: string; title: string; subject: string; due_date: string; description: string }) => (
            <TouchableOpacity key={h.id} onPress={() => router.push(`/(app)/homework/${h.id}` as never)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 }}>{h.title}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Due {h.due_date}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#4f46e5' }}>{h.subject}</Text>
                {h.description && (
                  <Text style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }} numberOfLines={2}>{h.description}</Text>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
