import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

apiClient.interceptors.request.use((config) => {
  // Read from in-memory store (synchronous) to avoid async storage race on navigation
  const { useAuthStore } = require('../../store/auth');
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      const { useAuthStore } = await import('../../store/auth');
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(err);
  }
);

export default apiClient;
