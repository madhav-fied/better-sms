import { create } from 'zustand';
import { Role } from '../types/auth';
import { storage } from '../lib/storage';
import { queryClient } from '../lib/queryClient';

interface AuthState {
  token: string | null;
  role: Role | null;
  schoolId: string | null;
  userId: string | null;
  entityId: string | null;
  expiresAt: string | null;
  hydrated: boolean;
  setSession: (s: Omit<AuthState, 'setSession' | 'clearSession' | 'hydrate' | 'hydrated'>) => void;
  clearSession: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  schoolId: null,
  userId: null,
  entityId: null,
  expiresAt: null,
  hydrated: false,
  setSession: async (s) => {
    if (s.token) await storage.setToken(s.token);
    set({ ...s, hydrated: true });
  },
  clearSession: async () => {
    await storage.clearToken();
    queryClient.clear();
    set({ token: null, role: null, schoolId: null, userId: null, entityId: null, expiresAt: null, hydrated: true });
  },
  hydrate: async () => {
    try {
      const token = await storage.getToken();
      if (token) set({ token, hydrated: true });
      else set({ hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));
