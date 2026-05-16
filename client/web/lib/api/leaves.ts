import apiClient from './client';

export const getLeaves = (params?: Record<string, unknown>) =>
  apiClient.get('/leaves', { params }).then((r) => r.data);

export const applyLeave = (data: unknown) =>
  apiClient.post('/leaves', data).then((r) => r.data);

export const updateLeave = (id: string, data: Record<string, unknown>) =>
  apiClient.put(`/leaves/${id}`, data).then((r) => r.data);

export const approveLeave = (id: string) =>
  apiClient.post(`/leaves/${id}/approve`).then((r) => r.data);

export const rejectLeave = (id: string, reason: string) =>
  apiClient.post(`/leaves/${id}/reject`, { reason }).then((r) => r.data);
