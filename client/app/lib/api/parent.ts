import apiClient from './client';

export const getMyChildren = (userId: string) =>
  apiClient.get('/students', { params: { parent_id: userId } }).then((r) => r.data);

export const getParents = (params?: Record<string, unknown>) =>
  apiClient.get('/parents', { params }).then((r) => r.data);

export const getParent = (id: string) =>
  apiClient.get(`/parents/${id}`).then((r) => r.data);
