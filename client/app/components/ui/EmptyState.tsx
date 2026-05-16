import { View, Text } from 'react-native';

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}
