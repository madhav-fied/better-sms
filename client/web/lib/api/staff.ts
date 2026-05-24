import apiClient from './client';
import { mapStaff } from '@/lib/mappers';

export const getStaff = async (params?: Record<string, unknown>) => {
  const res = await apiClient.get('/staff', { params });
  const rows = res.data?.data ?? [];
  return { ...res.data, data: rows.map(mapStaff) };
};

export const getStaffById = async (id: string) => {
  const res = await apiClient.get(`/staff/${id}`);
  const raw = res.data?.data;
  if (!raw) return res.data;
  return { ...res.data, data: mapStaff(raw) };
};

export const getStaffMember = getStaffById;

export const createStaff = (data: unknown) =>
  apiClient.post('/staff', data).then((r) => r.data);

export const updateStaff = (id: string, data: unknown) =>
  apiClient.put(`/staff/${id}`, data).then((r) => r.data);
