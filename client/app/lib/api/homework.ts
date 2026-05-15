import apiClient from './client';

export const getHomework = (params?: Record<string, unknown>) =>
  apiClient.get('/homework', { params }).then((r) => r.data);

export const getHomeworkById = (id: string) =>
  apiClient.get(`/homework/${id}`).then((r) => r.data);
