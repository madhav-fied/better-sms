export type Role = 'superadmin' | 'admin' | 'teacher' | 'staff' | 'student' | 'parent';

export interface AuthSession {
  token: string;
  role: Role;
  schoolId: string | null;
  userId: string;
  entityId: string;
  expiresAt: string;
}
