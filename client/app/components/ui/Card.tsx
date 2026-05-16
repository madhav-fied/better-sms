import { View, ViewProps } from 'react-native';

export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 }, style]} {...props}>
      {children}
    </View>
  );
}
