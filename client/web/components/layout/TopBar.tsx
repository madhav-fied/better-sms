'use client';
import { useAuthStore } from '@/store/auth';
import { ROLE_LABELS } from '@/constants/roles';
import { useRouter } from 'next/navigation';

export default function TopBar() {
  const { clearSession, role } = useAuthStore();
  const router = useRouter();

  const logout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <header className="h-14 border-b flex items-center justify-end px-6 gap-4 bg-white shrink-0">
      {role && (
        <span className="text-sm text-gray-400">{ROLE_LABELS[role]}</span>
      )}
      <button onClick={logout} className="text-sm text-red-500 hover:underline">
        Logout
      </button>
    </header>
  );
}
