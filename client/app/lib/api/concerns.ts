import apiClient from './client';

export const getConcerns = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/concerns', { params }).then((r) => r.data);

export const getConcern = (id: string) =>
  apiClient.get(`/communications/concerns/${id}`).then((r) => r.data);

export const createConcern = (data: unknown) =>
  apiClient.post('/communications/concerns', data).then((r) => r.data);

export const replyConcern = (id: string, message: string) =>
  apiClient.post(`/communications/concerns/${id}/messages`, { message }).then((r) => r.data);
