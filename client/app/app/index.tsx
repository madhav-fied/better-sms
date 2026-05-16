import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';

export default function Index() {
  const { token, hydrated } = useAuthStore();
  if (!hydrated) return null;
  return <Redirect href={token ? '/(app)/dashboard' : '/(auth)/login'} />;
}
