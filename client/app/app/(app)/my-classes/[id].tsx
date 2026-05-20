import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { getClassSection, getRosterStudents, getClassSubjects } from '../../../lib/api/core';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';

type Tab = 'roster' | 'subjects';

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('roster');

  const { data: csData } = useQuery({
    queryKey: ['class-section', id],
    queryFn: () => getClassSection(id),
    enabled: !!id,
  });
  const cs = csData?.data;

  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ['roster', id],
    queryFn: () => getRosterStudents(id, { limit: 200 }),
    enabled: tab === 'roster' && !!id,
  });
  const students = rosterData?.data ?? [];

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['class-subjects', id],
    queryFn: () => getClassSubjects(id),
    enabled: tab === 'subjects' && !!id,
  });
  const subjects = subjectsData?.data ?? [];

  const isLoading = tab === 'roster' ? rosterLoading : subjectsLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 16, color: '#4f46e5' }}>‹ Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
              {cs ? `${cs.class_name} - ${cs.section}` : '…'}
            </Text>
            {cs?.class_teacher_name ? (
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Teacher: {cs.class_teacher_name}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          backgroundColor: '#fff',
        }}
      >
        {(['roster', 'subjects'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: tab === t ? 2 : 0,
              borderBottomColor: '#4f46e5',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: tab === t ? '600' : '400',
                color: tab === t ? '#4f46e5' : '#6b7280',
                textTransform: 'capitalize',
              }}
            >
              {t === 'roster' ? 'Roster' : 'Subjects'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <Spinner />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {tab === 'roster' && (
            <>
              {students.length === 0 ? (
                <EmptyState message="No students in this class." />
              ) : (
                students.map(
                  (s: {
                    id: string;
                    first_name: string;
                    last_name?: string;
                    admission_no?: string;
                    roll_number?: string;
                    status: string;
                  }) => (
                    <Card
                      key={s.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>
                          {s.first_name} {s.last_name ?? ''}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          {s.admission_no ?? ''}
                          {s.roll_number ? ` · Roll: ${s.roll_number}` : ''}
                        </Text>
                      </View>
                      <Badge
                        label={s.status}
                        variant={s.status === 'active' ? 'success' : 'default'}
                      />
                    </Card>
                  )
                )
              )}
            </>
          )}

          {tab === 'subjects' && (
            <>
              {subjects.length === 0 ? (
                <EmptyState message="No subjects assigned to this class." />
              ) : (
                subjects.map(
                  (s: { id: string; subject: string; staff_name?: string }) => (
                    <Card key={s.id} style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                        {s.subject}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {s.staff_name ?? 'Unassigned'}
                      </Text>
                    </Card>
                  )
                )
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
