import { useAuthStore } from '../store/auth';
import { Role } from '../types/auth';

export function useRole() {
  const role = useAuthStore((s) => s.role);
  const is = (...roles: Role[]) => (role ? roles.includes(role) : false);
  return { role, is };
}
