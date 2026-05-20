import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { useRole } from '../../../hooks/useRole';
import { useParentChildStore } from '../../../store/parentChild';
import { ROLE_LABELS } from '../../../constants/roles';
import { getClassSubjects } from '../../../lib/api/core';
import apiClient from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
export default function SettingsScreen() {
  const { clearSession, userId, role, schoolId, entityId } = useAuthStore();
  const { role: userRole } = useRole();
  const { selectedChild } = useParentChildStore();

  const handleLogout = async () => {
    await clearSession();
    router.replace('/(auth)/login');
  };

  // Student: fetch own student data to get class_section_id
  const { data: student } = useQuery({
    queryKey: ['student-self', entityId],
    queryFn: () =>
      apiClient.get(`/students/${entityId}`).then((r) => r.data?.data),
    enabled: role === 'student' && !!entityId,
  });
  const classSectionId = student?.class_section_id;

  const { data: subjectsData } = useQuery({
    queryKey: ['my-class-subjects', classSectionId],
    queryFn: () => getClassSubjects(classSectionId!),
    enabled: !!classSectionId,
  });
  const subjects = subjectsData?.data ?? [];

  // Parent: use selectedChild from store
  const parentClassSectionId = selectedChild?.class_section_id;

  const { data: parentSubjectsData } = useQuery({
    queryKey: ['child-class-subjects', parentClassSectionId],
    queryFn: () => getClassSubjects(parentClassSectionId!),
    enabled: !!parentClassSectionId,
  });
  const parentSubjects = parentSubjectsData?.data ?? [];

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

        {/* My Class Info — student */}
        {role === 'student' && !!student?.class_section_id && (
          <Card style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>My Class</Text>
            <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>
              {student.class_name
                ? `${student.class_name}${student.section ? ' ' + student.section : ''}`
                : '—'}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Subjects</Text>
            {subjects.length > 0 ? (
              subjects.map((s: { id: string; subject: string; staff_name?: string }) => (
                <View
                  key={s.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#111827' }}>{s.subject}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{s.staff_name ?? '—'}</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>No subjects assigned</Text>
            )}
          </Card>
        )}

        {/* My Class Info — parent */}
        {role === 'parent' && !!selectedChild && (
          <Card style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              {selectedChild.first_name}'s Subjects
            </Text>
            {parentClassSectionId && parentSubjects.length > 0 ? (
              parentSubjects.map((s: { id: string; subject: string; staff_name?: string }) => (
                <View
                  key={s.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#111827' }}>{s.subject}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{s.staff_name ?? '—'}</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                No subjects assigned to this class
              </Text>
            )}
          </Card>
        )}

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
