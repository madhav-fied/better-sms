import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRole } from '../../../hooks/useRole';
import { useAuthStore } from '../../../store/auth';
import { useParentChildStore } from '../../../store/parentChild';
import { getHomework, createHomework } from '../../../lib/api/homework';
import { getClassSections } from '../../../lib/api/core';
import apiClient from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';

interface ClassSection { id: string; class_name: string; section: string; academic_year_id: string }

const EMPTY_FORM = { title: '', subject: '', description: '', due_date: '', class_section_id: '', academic_year_id: '' };

export default function HomeworkScreen() {
  const { role } = useRole();
  const { entityId } = useAuthStore();
  const { selectedChild } = useParentChildStore();
  const qc = useQueryClient();
  const isParent = role === 'parent';
  const isTeacher = role === 'teacher' || role === 'admin';

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const listParams: Record<string, unknown> = { limit: 20 };
  if (isParent && selectedChild?.class_section_id) {
    listParams.class_section_id = selectedChild.class_section_id;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['homework', isParent ? selectedChild?.class_section_id : 'all'],
    queryFn: () => getHomework(listParams),
  });

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

  const createMutation = useMutation({
    mutationFn: () => createHomework({
      title: form.title,
      subject: form.subject,
      description: form.description || undefined,
      due_date: form.due_date,
      assigned_date: new Date().toISOString().split('T')[0],
      class_section_id: form.class_section_id,
      academic_year_id: form.academic_year_id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homework'] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      Alert.alert('Success', 'Homework created');
    },
    onError: () => Alert.alert('Error', 'Failed to create homework'),
  });

  const items = data?.data ?? [];
  const canSubmit = !!form.title && !!form.subject && !!form.class_section_id && !!form.due_date;

  if (isLoading) return <Spinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Homework</Text>
          {isTeacher && (
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={{ backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>

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

      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>New Homework</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
              <View>
                <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Class *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {myClasses.map((cs) => (
                    <TouchableOpacity
                      key={cs.id}
                      onPress={() => setForm((f) => ({ ...f, class_section_id: cs.id, academic_year_id: cs.academic_year_id, subject: '' }))}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: form.class_section_id === cs.id ? '#4f46e5' : '#f3f4f6',
                      }}
                    >
                      <Text style={{ fontSize: 13, color: form.class_section_id === cs.id ? '#fff' : '#374151' }}>
                        {cs.class_name} {cs.section}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {myClasses.length === 0 && (
                    <Text style={{ fontSize: 13, color: '#9ca3af' }}>No classes assigned</Text>
                  )}
                </View>
              </View>

              <Input
                label="Subject *"
                value={form.subject}
                onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))}
                placeholder="e.g. Mathematics"
              />
              <Input
                label="Title *"
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                placeholder="Homework title"
              />
              <Input
                label="Due Date * (YYYY-MM-DD)"
                value={form.due_date}
                onChangeText={(v) => setForm((f) => ({ ...f, due_date: v }))}
                placeholder={new Date().toISOString().split('T')[0]}
                keyboardType="numbers-and-punctuation"
              />
              <Input
                label="Description"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Optional instructions..."
                multiline
                style={{ height: 80, textAlignVertical: 'top' }}
              />

              <Button
                title="Create Homework"
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
