import { ScrollView, View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { getLeaves, applyLeave, approveLeave, rejectLeave } from '../../../lib/api/leaves';
import { useRole } from '../../../hooks/useRole';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';

export default function LeavesScreen() {
  const { role } = useRole();
  const qc = useQueryClient();
  const canApprove = role === 'admin' || role === 'teacher';
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState('sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => getLeaves({ limit: 30 }),
  });
  const items = data?.data ?? [];

  const applyMutation = useMutation({
    mutationFn: () => applyLeave({ leave_type: leaveType, start_date: startDate, end_date: endDate, reason }),
    onSuccess: () => {
      Alert.alert('Applied', 'Leave application submitted');
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: () => Alert.alert('Error', 'Failed to apply'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLeave(id),
    onSuccess: () => { Alert.alert('Approved'); qc.invalidateQueries({ queryKey: ['leaves'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectLeave(id, 'Rejected'),
    onSuccess: () => { Alert.alert('Rejected'); qc.invalidateQueries({ queryKey: ['leaves'] }); },
  });

  if (isLoading) return <Spinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Leaves</Text>
          {!canApprove && (
            <TouchableOpacity onPress={() => setShowForm(!showForm)}>
              <Text style={{ color: '#4f46e5', fontSize: 14, fontWeight: '600' }}>+ Apply</Text>
            </TouchableOpacity>
          )}
        </View>

        {showForm && !canApprove && (
          <Card style={{ gap: 10 }}>
            <TextInput placeholder="Type (sick/casual/personal)" value={leaveType} onChangeText={setLeaveType}
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14 }} />
            <TextInput placeholder="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate}
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14 }} />
            <TextInput placeholder="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate}
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14 }} />
            <TextInput placeholder="Reason" value={reason} onChangeText={setReason} multiline numberOfLines={2}
              style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, textAlignVertical: 'top' }} />
            <Button title="Submit" loading={applyMutation.isPending} onPress={() => applyMutation.mutate()} disabled={!startDate || !endDate} />
          </Card>
        )}

        {items.map((l: { id: string; applicant_name?: string; leave_type: string; start_date: string; end_date: string; status: string }) => (
          <Card key={l.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{l.applicant_name ?? 'Leave'}</Text>
              <Badge label={l.status} variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'default'} />
            </View>
            <Text style={{ fontSize: 13, color: '#4b5563', textTransform: 'capitalize' }}>{l.leave_type}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{l.start_date} — {l.end_date}</Text>
            {canApprove && l.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button title="Approve" variant="primary" onPress={() => approveMutation.mutate(l.id)} style={{ flex: 1, paddingVertical: 8 }} />
                <Button title="Reject" variant="danger" onPress={() => rejectMutation.mutate(l.id)} style={{ flex: 1, paddingVertical: 8 }} />
              </View>
            )}
          </Card>
        ))}
        {items.length === 0 && (
          <Text style={{ textAlign: 'center', color: '#9ca3af', paddingTop: 40 }}>No leaves</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
