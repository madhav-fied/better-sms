import { Role } from '@/types/auth';

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  teacher: 'Teacher',
  staff: 'Staff',
  student: 'Student',
  parent: 'Parent',
};
