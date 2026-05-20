import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import apiClient from '../../../lib/api/client';
import { getClassSections } from '../../../lib/api/core';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function MyClassesScreen() {
  const { entityId } = useAuthStore();

  const { data: tsData, isLoading: tsLoading } = useQuery({
    queryKey: ['teacher-subjects-mine', entityId],
    queryFn: () =>
      apiClient
        .get('/teacher-subjects', { params: { staff_id: entityId, limit: 200 } })
        .then((r) => r.data?.data ?? []),
    enabled: !!entityId,
  });

  const { data: csData } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => getClassSections({ limit: 200 }),
  });
  const allSections = csData?.data ?? [];

  const myClassIds = [
    ...new Set(
      (tsData ?? []).map((ts: { class_section_id: string }) => ts.class_section_id)
    ),
  ];
  const myClasses = allSections.filter((cs: { id: string }) =>
    myClassIds.includes(cs.id)
  );

  if (tsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <Spinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>My Classes</Text>

        {myClasses.length === 0 ? (
          <EmptyState message="No classes assigned yet." />
        ) : (
          myClasses.map(
            (cs: {
              id: string;
              class_name: string;
              section: string;
              student_count?: number;
              subject_count?: number;
            }) => (
              <TouchableOpacity
                key={cs.id}
                onPress={() => router.push(`/my-classes/${cs.id}`)}
                activeOpacity={0.8}
              >
                <Card>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View>
                      <Text
                        style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}
                      >
                        {cs.class_name} - {cs.section}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {cs.student_count ?? 0} students · {cs.subject_count ?? 0} subjects
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: '#9ca3af' }}>›</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            )
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
