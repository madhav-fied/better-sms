import { ActivityIndicator, View } from 'react-native';

export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <ActivityIndicator size={size} color="#4f46e5" />
    </View>
  );
}
