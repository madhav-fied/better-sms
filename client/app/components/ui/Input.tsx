import { TextInput, Text, View, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</Text>}
      <TextInput
        style={[{
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#d1d5db',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          backgroundColor: '#fff',
        }, style]}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{error}</Text>}
    </View>
  );
}
