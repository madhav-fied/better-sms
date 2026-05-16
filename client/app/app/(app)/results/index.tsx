import { ScrollView, View, Text, TextInput, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { getResults, bulkSaveResults, publishResults } from '../../../lib/api/results';
import { useRole } from '../../../hooks/useRole';
import { useAuthStore } from '../../../store/auth';
import apiClient from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';

export default function ResultsScreen() {
  const { role } = useRole();
  const { entityId } = useAuthStore();
  const isTeacher = role === 'teacher';

  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [marks, setMarks] = useState<Record<string, string>>({});

  const { data: exams } = useQuery({ queryKey: ['exams'], queryFn: () => apiClient.get('/exams').then((r) => r.data?.data ?? []), enabled: isTeacher });
  const { data: studentsData } = useQuery({
    queryKey: ['my-students'],
    queryFn: () => apiClient.get('/students').then((r) => r.data?.data ?? []),
    enabled: isTeacher,
  });

  const { data: myResults, isLoading } = useQuery({
    queryKey: ['my-results', entityId],
    queryFn: () => getResults({ student_id: entityId }),
    enabled: !isTeacher && !!entityId,
  });

  const students: { id: string; name?: string; first_name?: string; last_name?: string }[] = studentsData ?? [];

  const saveMutation = useMutation({
    mutationFn: () => bulkSaveResults(students.map((s) => ({ student_id: s.id, exam_id: examId, subject_id: subjectId, marks_obtained: Number(marks[s.id] ?? 0) }))),
    onSuccess: () => Alert.alert('Saved', 'Draft saved'),
    onError: () => Alert.alert('Error', 'Save failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishResults({ exam_id: examId, subject_id: subjectId }),
    onSuccess: () => Alert.alert('Published', 'Results are now visible'),
    onError: () => Alert.alert('Error', 'Publish failed'),
  });

  if (!isTeacher) {
    const results = myResults?.data ?? [];
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>My Results</Text>
          {isLoading ? <Spinner /> : results.map((r: { id: string; subject_name: string; marks_obtained: number; max_marks: number; exam_name: string; grade?: string }) => (
            <Card key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600' }}>{r.subject_name}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>{r.exam_name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{r.marks_obtained}/{r.max_marks}</Text>
                {r.grade && <Text style={{ fontSize: 12, color: '#4f46e5' }}>{r.grade}</Text>}
              </View>
            </Card>
          ))}
          {!isLoading && results.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#9ca3af', paddingTop: 40 }}>No results published</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Enter Results</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Exam</Text>
        {(exams ?? []).map((e: { id: string; name: string }) => (
          <Card
            key={e.id}
            style={{ borderColor: examId === e.id ? '#4f46e5' : '#e5e7eb' }}
            onTouchEnd={() => setExamId(e.id)}
          >
            <Text style={{ fontSize: 14, color: examId === e.id ? '#4f46e5' : '#111827' }}>{e.name}</Text>
          </Card>
        ))}
        {students.map((s) => (
          <Card key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14 }}>
              {s.first_name ? `${s.first_name} ${s.last_name ?? ''}`.trim() : (s.name ?? '')}
            </Text>
            <TextInput
              placeholder="Marks"
              value={marks[s.id] ?? ''}
              onChangeText={(v) => setMarks((m) => ({ ...m, [s.id]: v }))}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 6, width: 64, textAlign: 'center', fontSize: 14 }}
            />
          </Card>
        ))}
        {students.length > 0 && examId && (
          <View style={{ gap: 8 }}>
            <Button title="Save Draft" variant="outline" loading={saveMutation.isPending} onPress={() => saveMutation.mutate()} />
            <Button title="Publish Results" loading={publishMutation.isPending} onPress={() => publishMutation.mutate()} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
