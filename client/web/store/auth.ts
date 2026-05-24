'use client';
import { create } from 'zustand';
import { Role } from '@/types/auth';
import { storage } from '@/lib/storage';

interface AuthState {
  token: string | null;
  role: Role | null;
  schoolId: string | null;
  userId: string | null;
  entityId: string | null;
  expiresAt: string | null;
  setSession: (s: Omit<AuthState, 'setSession' | 'clearSession'>) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  schoolId: null,
  userId: null,
  entityId: null,
  expiresAt: null,
  setSession: (s) => {
    if (s.token) storage.setToken(s.token);
    if (s.schoolId) storage.setActiveSchoolId(s.schoolId);
    set(s);
  },
  clearSession: () => {
    storage.clearToken();
    storage.clearActiveSchoolId();
    set({ token: null, role: null, schoolId: null, userId: null, entityId: null, expiresAt: null });
  },
}));
