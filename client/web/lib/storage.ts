const TOKEN_KEY = 'sms_token';
const SCHOOL_KEY = 'sms_active_school_id';

export const storage = {
  getToken: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  getActiveSchoolId: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(SCHOOL_KEY) : null,
  setActiveSchoolId: (id: string) => localStorage.setItem(SCHOOL_KEY, id),
  clearActiveSchoolId: () => localStorage.removeItem(SCHOOL_KEY),
};
