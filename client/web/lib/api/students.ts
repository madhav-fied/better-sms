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

export const changeClassSection = (data: {
  student_ids: string[];
  to_class_section_id: string;
}) => apiClient.post('/students/change-class-section', data).then((r) => r.data);

export const migrateStudents = (data: {
  student_ids: string[];
  from_academic_year_id: string;
  to_academic_year_id: string;
  to_class_section_id: string;
  promote_date: string;
}) => apiClient.post('/students/migrate', data).then((r) => r.data);
