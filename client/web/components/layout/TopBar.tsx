'use client';
import { useAuthStore } from '@/store/auth';
import { ROLE_LABELS } from '@/constants/roles';
import { useRouter } from 'next/navigation';

export default function TopBar() {
  const { clearSession, role, schoolName, schoolBranchName } = useAuthStore();
  const router = useRouter();

  const logout = () => {
    clearSession();
    router.replace('/login');
  };

  const displayName = schoolBranchName
    ? `${schoolName} — ${schoolBranchName}`
    : schoolName;

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-white shrink-0">
      <div>
        {displayName && (
          <p className="text-sm font-semibold text-gray-800">{displayName}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {role && (
          <span className="text-xs text-gray-400 uppercase tracking-wide">{ROLE_LABELS[role]}</span>
        )}
        <button onClick={logout} className="text-sm text-red-500 hover:underline">
          Logout
        </button>
      </div>
    </header>
  );
}
