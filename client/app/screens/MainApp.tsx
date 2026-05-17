import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth';

export default function MainApp() {
  const { role, clearSession } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.role}>{role}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={clearSession}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  role: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize' },
  logoutBtn: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#ef4444', borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
