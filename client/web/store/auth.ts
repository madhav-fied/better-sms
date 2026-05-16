'use client';
import { create } from 'zustand';
import { Role } from '@/types/auth';
import { storage } from '@/lib/storage';

interface AuthState {
  token: string | null;
  role: Role | null;
  schoolId: string | null;
  schoolName: string | null;
  schoolBranchName: string | null;
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
  schoolName: null,
  schoolBranchName: null,
  userId: null,
  entityId: null,
  expiresAt: null,
  setSession: (s) => {
    if (s.token) storage.setToken(s.token);
    set(s);
  },
  clearSession: () => {
    storage.clearToken();
    set({ token: null, role: null, schoolId: null, schoolName: null, schoolBranchName: null, userId: null, entityId: null, expiresAt: null });
  },
}));
