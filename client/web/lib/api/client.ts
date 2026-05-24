import axios from 'axios';
import { storage } from '@/lib/storage';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const schoolId = storage.getActiveSchoolId();
  if (schoolId) config.headers['X-School-Id'] = schoolId;
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      storage.clearToken();
      storage.clearActiveSchoolId();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default apiClient;
