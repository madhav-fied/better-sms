export type Role = 'superadmin' | 'admin' | 'teacher' | 'staff' | 'student' | 'parent';

export interface AuthSession {
  token: string;
  role: Role;
  schoolId: string | null;
  userId: string;
  entityId: string;
  expiresAt: string;
}

export interface MeResponse {
  id: string;
  role: Role;
  school_id: string | null;
  entity_id: string;
  expires_at: string;
}
