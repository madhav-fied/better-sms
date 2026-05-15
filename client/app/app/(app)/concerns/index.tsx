import { ScrollView, View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { getConcerns, createConcern } from '../../../lib/api/concerns';
import { useRole } from '../../../hooks/useRole';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ConcernsScreen() {
  const { role } = useRole();
  const qc = useQueryClient();
  const isParent = role === 'parent';
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['concerns'], queryFn: () => getConcerns({ limit: 30 }) });
  const items = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => createConcern({ subject: newSubject, message: newMessage }),
    onSuccess: () => {
      Alert.alert('Submitted', 'Your concern has been submitted');
      setShowForm(false);
      setNewSubject(''); setNewMessage('');
      qc.invalidateQueries({ queryKey: ['concerns'] });
    },
    onError: () => Alert.alert('Error', 'Failed to submit concern'),
  });

  if (isLoading) return <Spinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Concerns</Text>
          {isParent && (
            <TouchableOpacity onPress={() => setShowForm(!showForm)}>
              <Text style={{ color: '#4f46e5', fontSize: 14, fontWeight: '600' }}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>

        {isParent && showForm && (
          <Card style={{ gap: 10 }}>
            <TextInput
              placeholder="Subject"
              value={newSubject}
              onChangeText={setNewSubject}
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14 }}
            />
            <TextInput
              placeholder="Message"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, textAlignVertical: 'top' }}
            />
            <Button title="Submit" loading={createMutation.isPending} onPress={() => createMutation.mutate()} disabled={!newSubject || !newMessage} />
          </Card>
        )}

        {items.length === 0 ? (
          <EmptyState message="No concerns" />
        ) : (
          items.map((c: { id: string; subject: string; status: string; created_at: string }) => (
            <TouchableOpacity key={c.id} onPress={() => router.push(`/(app)/concerns/${c.id}` as never)}>
              <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{c.subject}</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.created_at?.split('T')[0]}</Text>
                </View>
                <Badge label={c.status} variant={c.status === 'resolved' ? 'secondary' : 'default'} />
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
