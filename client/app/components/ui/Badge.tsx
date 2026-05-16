import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'secondary';

const STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: '#dbeafe', text: '#1e40af' },
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef9c3', text: '#854d0e' },
  danger: { bg: '#fee2e2', text: '#991b1b' },
  secondary: { bg: '#f3f4f6', text: '#4b5563' },
};

export function Badge({ label, variant = 'default' }: { label: string; variant?: BadgeVariant }) {
  const s = STYLES[variant];
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start' }}>
      <Text style={{ color: s.text, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{label}</Text>
    </View>
  );
}
