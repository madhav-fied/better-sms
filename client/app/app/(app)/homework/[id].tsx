import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { getHomeworkById, updateHomework } from '../../../lib/api/homework';
import { Spinner } from '../../../components/ui/Spinner';

export default function HomeworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['homework', id], queryFn: () => getHomeworkById(id) });
  const hw = data?.data;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', description: '', due_date: '', assigned_date: '' });

  const openEdit = () => {
    if (hw) {
      setForm({
        title: hw.title ?? '',
        subject: hw.subject ?? '',
        description: hw.description ?? '',
        due_date: hw.due_date ?? '',
        assigned_date: hw.assigned_date ?? '',
      });
      setEditing(true);
    }
  };

  const mutation = useMutation({
    mutationFn: () => updateHomework(id, {
      title: form.title || undefined,
      subject: form.subject || undefined,
      description: form.description || undefined,
      due_date: form.due_date || undefined,
      assigned_date: form.assigned_date || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homework', id] });
      qc.invalidateQueries({ queryKey: ['homework'] });
      setEditing(false);
    },
  });

  if (isLoading) return <Spinner />;
  if (!hw) return (
    <SafeAreaView style={s.container}>
      <Text style={s.empty}>Homework not found</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          {hw.status !== 'cancelled' && !editing && (
            <TouchableOpacity onPress={openEdit} style={s.editBtn}>
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {!editing ? (
          <>
            <Text style={s.title}>{hw.title}</Text>
            <Text style={s.subject}>{hw.subject}</Text>
            <View style={s.card}>
              {hw.assigned_date && <Row label="Assigned" value={hw.assigned_date} />}
              <Row label="Due Date" value={hw.due_date} />
              {hw.description && <Row label="Description" value={hw.description} />}
            </View>
          </>
        ) : (
          <>
            <Text style={[s.title, { marginBottom: 12 }]}>Edit Homework</Text>
            <View style={s.card}>
              <Field label="Title">
                <TextInput style={s.input} value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
              </Field>
              <Field label="Subject">
                <TextInput style={s.input} value={form.subject} onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))} />
              </Field>
              <Field label="Assigned Date">
                <TextInput style={s.input} value={form.assigned_date} onChangeText={(v) => setForm((f) => ({ ...f, assigned_date: v }))} placeholder="YYYY-MM-DD" />
              </Field>
              <Field label="Due Date">
                <TextInput style={s.input} value={form.due_date} onChangeText={(v) => setForm((f) => ({ ...f, due_date: v }))} placeholder="YYYY-MM-DD" />
              </Field>
              <Field label="Description">
                <TextInput
                  style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                />
              </Field>
            </View>
            <View style={s.actions}>
              <TouchableOpacity onPress={() => setEditing(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => mutation.mutate()} style={s.saveBtn} disabled={mutation.isPending}>
                {mutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: '#111827' }}>{value}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: '600' }}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  back: { fontSize: 14, color: '#6b7280' },
  editBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  editBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subject: { fontSize: 13, color: '#4f46e5', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#fff',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelText: { fontSize: 14, color: '#374151' },
  saveBtn: { flex: 1, backgroundColor: '#4f46e5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
});
