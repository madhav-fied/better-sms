import apiClient from './client';

export const getStudents = (params?: Record<string, unknown>) =>
  apiClient.get('/students', { params }).then((r) => r.data);

export const getStudent = (id: string) =>
  apiClient.get(`/students/${id}`).then((r) => r.data);

export const createStudent = (data: unknown) =>
  apiClient.post('/students', data).then((r) => r.data);

export const updateStudent = (id: string, data: unknown) =>
  apiClient.put(`/students/${id}`, data).then((r) => r.data);

export const getClassSections = (params?: Record<string, unknown>) =>
  apiClient.get('/class-sections', { params }).then((r) => r.data);
