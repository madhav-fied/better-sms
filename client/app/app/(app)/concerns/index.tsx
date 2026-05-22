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

const CATEGORIES = ['suggestion', 'complaint', 'concern', 'query'] as const;
const DIRECTED_TO = ['class_teacher', 'specific_staff', 'admin'] as const;

type Category = typeof CATEGORIES[number];
type DirectedTo = typeof DIRECTED_TO[number];

export default function ConcernsScreen() {
  const { role } = useRole();
  const qc = useQueryClient();
  const isParent = role === 'parent';

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<Category>('concern');
  const [directedTo, setDirectedTo] = useState<DirectedTo>('admin');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['concerns'], queryFn: () => getConcerns({ limit: 30 }) });
  const items = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => createConcern({
      category,
      subject,
      directed_to: directedTo,
      initial_message: initialMessage,
    }),
    onSuccess: () => {
      Alert.alert('Submitted', 'Your concern has been submitted');
      setShowForm(false);
      setCategory('concern'); setDirectedTo('admin');
      setSubject(''); setInitialMessage('');
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
          <Card style={{ gap: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1,
                    borderColor: category === c ? '#4f46e5' : '#d1d5db',
                    backgroundColor: category === c ? '#eef2ff' : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 13, color: category === c ? '#4f46e5' : '#374151', textTransform: 'capitalize' }}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Directed To</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DIRECTED_TO.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDirectedTo(d)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1,
                    borderColor: directedTo === d ? '#4f46e5' : '#d1d5db',
                    backgroundColor: directedTo === d ? '#eef2ff' : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 13, color: directedTo === d ? '#4f46e5' : '#374151', textTransform: 'capitalize' }}>
                    {d.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Subject"
              value={subject}
              onChangeText={setSubject}
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14 }}
            />
            <TextInput
              placeholder="Message"
              value={initialMessage}
              onChangeText={setInitialMessage}
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, textAlignVertical: 'top' }}
            />
            <Button title="Submit" loading={createMutation.isPending} onPress={() => createMutation.mutate()} disabled={!subject || !initialMessage} />
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
