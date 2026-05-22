import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRole } from '../../../hooks/useRole';
import { useAuthStore } from '../../../store/auth';
import { useParentChildStore } from '../../../store/parentChild';
import { getAttendanceHistory, markStudentAttendance } from '../../../lib/api/attendance';
import { getClassSections } from '../../../lib/api/core';
import apiClient from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Badge } from '../../../components/ui/Badge';

interface Student { id: string; name?: string; first_name?: string; last_name?: string }
interface ClassSection { id: string; class_name: string; section: string }

export default function AttendanceScreen() {
  const { role } = useRole();
  const { entityId } = useAuthStore();
  const { selectedChildId } = useParentChildStore();
  const [classSectionId, setClassSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, string>>({});

  const isTeacher = role === 'teacher';
  const isViewer = role === 'student' || role === 'parent';
  const viewerStudentId = role === 'parent' ? selectedChildId : entityId;

  const { data: sectionsData } = useQuery({
    queryKey: ['class-sections', 'my-classes'],
    queryFn: () => getClassSections({ limit: 200, class_teacher_only: true }),
    enabled: isTeacher,
  });
  const sections = sectionsData?.data ?? [];

  const { data: studentsData } = useQuery({
    queryKey: ['att-students', classSectionId],
    queryFn: () => apiClient.get('/students', { params: { class_section_id: classSectionId } }).then((r) => r.data?.data ?? []),
    enabled: isTeacher && !!classSectionId,
  });

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['att-history', viewerStudentId],
    queryFn: () => getAttendanceHistory({ student_id: viewerStudentId, limit: 30 }),
    enabled: isViewer && !!viewerStudentId,
  });

  const students: Student[] = studentsData ?? [];
  const history = historyData?.data ?? [];

  const markMutation = useMutation({
    mutationFn: () => markStudentAttendance({
      class_section_id: classSectionId,
      date,
      records: students.map((s) => ({ student_id: s.id, status: records[s.id] ?? 'absent' })),
    }),
    onSuccess: () => Alert.alert('Success', 'Attendance saved'),
    onError: () => Alert.alert('Error', 'Failed to save attendance'),
  });

  if (isViewer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
            {role === 'parent' ? "Child's Attendance" : 'My Attendance'}
          </Text>
          {histLoading ? <Spinner /> : history.map((r: { date: string; status: string }, i: number) => (
            <Card key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#4b5563' }}>{r.date}</Text>
              <Badge
                label={r.status}
                variant={r.status === 'present' ? 'success' : r.status === 'leave' ? 'warning' : 'danger'}
              />
            </Card>
          ))}
          {!histLoading && history.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#9ca3af', paddingTop: 40 }}>No attendance records</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Mark Attendance</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Date: {date}</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Class</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {(sections ?? []).map((c: ClassSection) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => { setClassSectionId(c.id); setRecords({}); }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: classSectionId === c.id ? '#4f46e5' : '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 12, color: classSectionId === c.id ? '#fff' : '#374151' }}>
                {c.class_name} {c.section}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {students.map((s) => (
          <Card key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#111827' }}>
              {s.first_name ? `${s.first_name} ${s.last_name ?? ''}`.trim() : (s.name ?? '')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['present', 'absent', 'leave'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setRecords((r) => ({ ...r, [s.id]: status }))}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: records[s.id] === status
                      ? status === 'present' ? '#166534' : status === 'absent' ? '#991b1b' : '#92400e'
                      : '#e5e7eb',
                  }}
                >
                  <Text style={{ fontSize: 11, color: records[s.id] === status ? '#fff' : '#374151', fontWeight: '500', textTransform: 'capitalize' }}>
                    {status.charAt(0).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        ))}

        {students.length > 0 && (
          <Button title="Submit Attendance" loading={markMutation.isPending} onPress={() => markMutation.mutate()} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
