import apiClient from './client';

export const getHomework = (params?: Record<string, unknown>) =>
  apiClient.get('/homework', { params }).then((r) => r.data);

export const getHomeworkById = (id: string) =>
  apiClient.get(`/homework/${id}`).then((r) => r.data);

export const createHomework = (data: unknown) =>
  apiClient.post('/homework', data).then((r) => r.data);

export const updateHomework = (id: string, data: unknown) =>
  apiClient.put(`/homework/${id}`, data).then((r) => r.data);

export const deleteHomework = (id: string) =>
  apiClient.delete(`/homework/${id}`).then((r) => r.data);
