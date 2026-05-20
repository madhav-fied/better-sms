import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRole } from '../../../hooks/useRole';
import { useAuthStore } from '../../../store/auth';
import { getNotices, createNotice } from '../../../lib/api/notices';
import { getClassSections } from '../../../lib/api/core';
import apiClient from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';

interface ClassSection { id: string; class_name: string; section: string }
type TargetType = 'school_wide' | 'class_sections';

export default function NoticesScreen() {
  const { role } = useRole();
  const { entityId } = useAuthStore();
  const qc = useQueryClient();
  const isTeacher = role === 'teacher' || role === 'admin';

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<TargetType>(role === 'teacher' ? 'class_sections' : 'school_wide');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({ queryKey: ['notices'], queryFn: () => getNotices({ limit: 30 }) });

  const { data: tsData } = useQuery({
    queryKey: ['teacher-subjects-mine', entityId],
    queryFn: () => apiClient.get('/teacher-subjects', { params: { staff_id: entityId, limit: 200 } }).then((r) => r.data?.data ?? []),
    enabled: isTeacher && role === 'teacher',
  });
  const { data: csData } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => getClassSections({ limit: 200 }),
    enabled: isTeacher,
  });

  const allSections: ClassSection[] = csData?.data ?? [];
  const myClassIds: string[] = role === 'teacher'
    ? [...new Set<string>((tsData ?? []).map((ts: { class_section_id: string }) => ts.class_section_id))]
    : allSections.map((cs) => cs.id);
  const myClasses = allSections.filter((cs) => myClassIds.includes(cs.id));

  const toggleClass = (id: string) =>
    setSelectedClassIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setSelectedClassIds([]);
    setTargetType(role === 'teacher' ? 'class_sections' : 'school_wide');
  };

  const createMutation = useMutation({
    mutationFn: () => createNotice({
      title,
      body: body || undefined,
      target_type: targetType,
      target_class_section_ids: targetType === 'class_sections' ? selectedClassIds : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      setShowCreate(false);
      resetForm();
      Alert.alert('Success', 'Notice published');
    },
    onError: () => Alert.alert('Error', 'Failed to publish notice'),
  });

  const canSubmit = title.trim().length > 0 && (targetType === 'school_wide' || selectedClassIds.length > 0);
  const items = data?.data ?? [];

  if (isLoading) return <Spinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Notices</Text>
          {isTeacher && (
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={{ backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>

        {items.length === 0 ? (
          <EmptyState message="No notices" />
        ) : (
          items.map((n: { id: string; title: string; created_at: string }) => (
            <TouchableOpacity key={n.id} onPress={() => router.push(`/(app)/notices/${n.id}` as never)}>
              <Card>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 }}>{n.title}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>{n.created_at?.split('T')[0]}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowCreate(false); resetForm(); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>New Notice</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
              <Input
                label="Title *"
                value={title}
                onChangeText={setTitle}
                placeholder="Notice title"
              />
              <Input
                label="Message"
                value={body}
                onChangeText={setBody}
                placeholder="Optional body text..."
                multiline
                style={{ height: 100, textAlignVertical: 'top' }}
              />

              {/* Audience toggle — teachers are locked to class_sections */}
              {role !== 'teacher' && (
                <View>
                  <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Audience</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['school_wide', 'class_sections'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => { setTargetType(t); setSelectedClassIds([]); }}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                          backgroundColor: targetType === t ? '#4f46e5' : '#f3f4f6',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: targetType === t ? '#fff' : '#374151' }}>
                          {t === 'school_wide' ? 'School Wide' : 'Specific Classes'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {(targetType === 'class_sections') && (
                <View>
                  <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                    Classes *{selectedClassIds.length > 0 ? ` (${selectedClassIds.length} selected)` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {myClasses.map((cs) => (
                      <TouchableOpacity
                        key={cs.id}
                        onPress={() => toggleClass(cs.id)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                          backgroundColor: selectedClassIds.includes(cs.id) ? '#4f46e5' : '#f3f4f6',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: selectedClassIds.includes(cs.id) ? '#fff' : '#374151' }}>
                          {cs.class_name} {cs.section}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {myClasses.length === 0 && (
                      <Text style={{ fontSize: 13, color: '#9ca3af' }}>No classes assigned</Text>
                    )}
                  </View>
                </View>
              )}

              <Button
                title="Publish Notice"
                loading={createMutation.isPending}
                onPress={() => createMutation.mutate()}
                disabled={!canSubmit}
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
