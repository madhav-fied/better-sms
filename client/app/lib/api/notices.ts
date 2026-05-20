import apiClient from './client';

export const getNotices = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/notices', { params }).then((r) => r.data);

export const getNotice = (id: string) =>
  apiClient.get(`/communications/notices/${id}`).then((r) => r.data);

export const createNotice = (data: Record<string, unknown>) =>
  apiClient.post('/communications/notices', data).then((r) => r.data);
