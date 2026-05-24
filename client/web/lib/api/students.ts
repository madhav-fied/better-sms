import apiClient from './client';
import { mapStudent } from '@/lib/mappers';

export const getStudents = async (params?: Record<string, unknown>) => {
  const res = await apiClient.get('/students', { params });
  const rows = res.data?.data ?? [];
  return { ...res.data, data: rows.map(mapStudent) };
};

export const getStudentById = async (id: string) => {
  const res = await apiClient.get(`/students/${id}`);
  const raw = res.data?.data;
  if (!raw) return res.data;
  return { ...res.data, data: mapStudent(raw) };
};

export const getStudent = getStudentById;

export const createStudent = (data: unknown) =>
  apiClient.post('/students', data).then((r) => r.data);

export const updateStudent = (id: string, data: unknown) =>
  apiClient.put(`/students/${id}`, data).then((r) => r.data);

export const getClassSections = (params?: Record<string, unknown>) =>
  apiClient.get('/class-sections', { params }).then((r) => r.data);
