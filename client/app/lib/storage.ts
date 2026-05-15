import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'sms_token';

export const storage = {
  getToken: async (): Promise<string | null> => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: async (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  clearToken: async () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
