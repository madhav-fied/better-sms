import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { getConcern, replyConcern, acknowledgeConcern, resolveConcern } from '../../../lib/api/concerns';
import { useRole } from '../../../hooks/useRole';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'danger'> = {
  open: 'default',
  acknowledged: 'default',
  in_progress: 'default',
  resolved: 'success',
  closed: 'secondary',
};

export default function ConcernDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useRole();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['concern', id],
    queryFn: () => getConcern(id),
    enabled: !!id,
  });
  const concern = data?.data;

  const replyMutation = useMutation({
    mutationFn: () => replyConcern(id, reply),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['concern', id] });
    },
    onError: () => Alert.alert('Error', 'Failed to send reply'),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => acknowledgeConcern(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concern', id] }),
    onError: () => Alert.alert('Error', 'Failed to acknowledge'),
  });

  const resolveMutation = useMutation({
    mutationFn: () => resolveConcern(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concern', id] }),
    onError: () => Alert.alert('Error', 'Failed to resolve'),
  });

  if (isLoading) return <Spinner />;
  if (!concern) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>Concern not found</Text>
    </SafeAreaView>
  );

  const isStaff = role === 'admin' || role === 'teacher' || role === 'superadmin';
  const canAcknowledge = isStaff && concern.status === 'open';
  const canResolve = isStaff && (concern.status === 'open' || concern.status === 'acknowledged' || concern.status === 'in_progress');
  const isClosed = concern.status === 'closed' || concern.status === 'resolved';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 }}>{concern.subject}</Text>
              <Badge label={concern.status} variant={STATUS_VARIANT[concern.status] ?? 'default'} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{concern.category}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>→ {concern.directed_to?.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>{concern.created_at?.split('T')[0]}</Text>
          </View>

          {/* Staff actions */}
          {isStaff && (canAcknowledge || canResolve) && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {canAcknowledge && (
                <Button
                  title="Acknowledge"
                  variant="secondary"
                  loading={acknowledgeMutation.isPending}
                  onPress={() => acknowledgeMutation.mutate()}
                  style={{ flex: 1 }}
                />
              )}
              {canResolve && (
                <Button
                  title="Resolve"
                  variant="primary"
                  loading={resolveMutation.isPending}
                  onPress={() => resolveMutation.mutate()}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}

          {/* Messages */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Messages</Text>
          {(concern.messages ?? []).map((m: { id: string; sender_name: string; sender_type: string; body: string; created_at: string }) => (
            <View
              key={m.id}
              style={{
                backgroundColor: m.sender_type === 'parent' ? '#eef2ff' : '#fff',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: m.sender_type === 'parent' ? '#c7d2fe' : '#e5e7eb',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>{m.sender_name}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>{m.created_at?.split('T')[0]}</Text>
              </View>
              <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>{m.body}</Text>
            </View>
          ))}

          {/* Reply */}
          {!isClosed && (
            <View style={{ gap: 8 }}>
              <TextInput
                placeholder="Write a reply…"
                value={reply}
                onChangeText={setReply}
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
                  padding: 10, fontSize: 14, textAlignVertical: 'top', backgroundColor: '#fff',
                }}
              />
              <Button
                title="Send"
                loading={replyMutation.isPending}
                onPress={() => replyMutation.mutate()}
                disabled={!reply.trim()}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
