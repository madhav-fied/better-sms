const TOKEN_KEY = 'sms_token';

export const storage = {
  getToken: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};
