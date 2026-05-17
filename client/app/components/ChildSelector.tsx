import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { useParentChildStore } from '../store/parentChild';
import { getMyChildren } from '../lib/api/parent';

export function ChildSelector() {
  const { userId } = useAuthStore();
  const { selectedChildId, children, setChildren, setSelectedChild } = useParentChildStore();

  useQuery({
    queryKey: ['my-children', userId],
    queryFn: async () => {
      const res = await getMyChildren(userId!);
      setChildren(res.data ?? []);
      return res;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (children.length <= 1) return null;

  return (
    <View style={{ backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Select Child
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {children.map((c) => {
          const isActive = selectedChildId === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedChild(c.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: isActive ? '#4f46e5' : '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 13, color: isActive ? '#fff' : '#374151', fontWeight: '500' }}>
                {c.first_name} {c.last_name ?? ''}
                {c.class_name ? ` · ${c.class_name}${c.section ? ' ' + c.section : ''}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
