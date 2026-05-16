import axios from 'axios';
import { storage } from '../storage';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      await storage.clearToken();
      // Dynamic import avoids circular dependency with store at module load time
      const { useAuthStore } = await import('../../store/auth');
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(err);
  }
);

export default apiClient;
