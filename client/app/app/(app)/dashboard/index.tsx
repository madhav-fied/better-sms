import { ScrollView, View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRole } from '../../../hooks/useRole';
import { useAuthStore } from '../../../store/auth';
import { useParentChildStore } from '../../../store/parentChild';
import apiClient from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { ROLE_LABELS } from '../../../constants/roles';

export default function DashboardScreen() {
  const { role } = useRole();
  const { userId } = useAuthStore();
  const { selectedChildId, selectedChild } = useParentChildStore();

  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiClient.get('/dashboard/header-summary').then((r) => r.data?.data),
    enabled: role === 'admin' || role === 'superadmin',
  });

  const teacherInfo = useQuery({
    queryKey: ['teacher-dashboard', userId],
    queryFn: () => apiClient.get('/dashboard/teacher-summary').then((r) => r.data?.data),
    enabled: role === 'teacher',
  });

  const studentInfo = useQuery({
    queryKey: ['student-dashboard', userId],
    queryFn: () => apiClient.get(`/students/${userId}/summary`).then((r) => r.data?.data),
    enabled: role === 'student',
  });

  const parentChildInfo = useQuery({
    queryKey: ['parent-child-dashboard', selectedChildId],
    queryFn: () => apiClient.get(`/students/${selectedChildId}`).then((r) => r.data?.data),
    enabled: role === 'parent' && !!selectedChildId,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
          {role ? ROLE_LABELS[role] : ''} Dashboard
        </Text>

        {(role === 'admin' || role === 'superadmin') && (
          <>
            {summary.isLoading ? <Spinner size="small" /> : (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Card style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Students</Text>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>{summary.data?.students ?? '—'}</Text>
                </Card>
                <Card style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Staff</Text>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>{summary.data?.staff ?? '—'}</Text>
                </Card>
              </View>
            )}
            <Card>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 }}>Academic Year</Text>
              <Text style={{ color: '#4b5563' }}>{summary.data?.ay_label ?? '—'}</Text>
            </Card>
          </>
        )}

        {role === 'teacher' && (
          <>
            <Card>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Today's Schedule</Text>
              {teacherInfo.isLoading ? <Spinner size="small" /> : (
                (teacherInfo.data?.today_periods ?? []).map((p: { period_name: string; subject: string; class_name: string }, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={{ fontSize: 13, color: '#4b5563' }}>{p.period_name}</Text>
                    <Text style={{ fontSize: 13, color: '#111827' }}>{p.subject} · {p.class_name}</Text>
                  </View>
                ))
              )}
            </Card>
          </>
        )}

        {role === 'student' && (
          <>
            <Card>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Attendance This Month</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                {studentInfo.data?.attendance_pct ? `${studentInfo.data.attendance_pct}%` : '—'}
              </Text>
            </Card>
            <Card>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 }}>Upcoming Exams</Text>
              {(studentInfo.data?.upcoming_exams ?? []).map((e: { name: string; date: string }, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                  <Text style={{ fontSize: 13, color: '#4b5563' }}>{e.name}</Text>
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>{e.date}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {role === 'staff' && (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Today's Status</Text>
            <Text style={{ color: '#4b5563', fontSize: 13 }}>Check attendance and leave balance in the respective tabs.</Text>
          </Card>
        )}

        {role === 'parent' && (
          <>
            {selectedChild && (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                  {selectedChild.first_name} {selectedChild.last_name ?? ''}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  {selectedChild.class_name ? `${selectedChild.class_name}${selectedChild.section ? ' ' + selectedChild.section : ''}` : 'No class assigned'}
                </Text>
              </Card>
            )}
            {parentChildInfo.isLoading ? <Spinner size="small" /> : null}
            <Card>
              <Text style={{ fontSize: 13, color: '#4b5563' }}>View your child's attendance, results, and homework in the tabs below.</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
