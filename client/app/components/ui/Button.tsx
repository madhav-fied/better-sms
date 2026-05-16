import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

const VARIANT_STYLES = {
  primary: { bg: '#1f2937', text: '#ffffff' },
  secondary: { bg: '#6b7280', text: '#ffffff' },
  danger: { bg: '#ef4444', text: '#ffffff' },
  outline: { bg: 'transparent', text: '#1f2937' },
};

export function Button({ title, loading, variant = 'primary', disabled, style, ...props }: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  return (
    <TouchableOpacity
      disabled={disabled || loading}
      style={[{
        backgroundColor: v.bg,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        opacity: (disabled || loading) ? 0.5 : 1,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: '#1f2937',
      }, style]}
      {...props}
    >
      {loading
        ? <ActivityIndicator color={v.text} size="small" />
        : <Text style={{ color: v.text, fontWeight: '600', fontSize: 14 }}>{title}</Text>
      }
    </TouchableOpacity>
  );
}
