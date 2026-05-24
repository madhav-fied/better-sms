import apiClient from './client';

export const getLeaves = (params?: Record<string, unknown>) =>
  apiClient.get('/leaves', { params }).then((r) => r.data);

export const applyLeave = (data: unknown) =>
  apiClient.post('/leaves', data).then((r) => r.data);

export const approveLeave = (id: string) =>
  apiClient.post(`/leaves/${id}/approve`).then((r) => r.data);

export const rejectLeave = (id: string, reason?: string) =>
  apiClient.post(`/leaves/${id}/reject`, reason ? { reason } : {}).then((r) => r.data);
