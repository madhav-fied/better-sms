import type { Role } from '@/types/auth';

export interface SessionPayload {
  token: string;
  role: Role;
  school_id: string | null;
  user_id: string;
  entity_id: string | null;
  expires_at: string;
}

export function sessionFromResponse(data: SessionPayload) {
  return {
    token: data.token,
    role: data.role as Role,
    schoolId: data.school_id,
    userId: data.user_id,
    entityId: data.entity_id,
    expiresAt: data.expires_at,
  };
}
