import apiClient from './client';

export const getStaff = (params?: Record<string, unknown>) =>
  apiClient.get('/staff', { params }).then((r) => r.data);

export const getStaffMember = (id: string) =>
  apiClient.get(`/staff/${id}`).then((r) => r.data);

export const createStaff = (data: unknown) =>
  apiClient.post('/staff', data).then((r) => r.data);

export const updateStaff = (id: string, data: unknown) =>
  apiClient.put(`/staff/${id}`, data).then((r) => r.data);

export const upsertJobDetail = (staffId: string, data: unknown) =>
  apiClient.put(`/staff/${staffId}/job-detail`, data).then((r) => r.data);

export const toggleStaffStatus = (id: string) =>
  apiClient.patch(`/staff/${id}/status`).then((r) => r.data);

export const getTeacherSubjects = (staffId: string) =>
  apiClient.get('/teacher-subjects', { params: { staff_id: staffId, limit: 100 } }).then((r) => r.data);
