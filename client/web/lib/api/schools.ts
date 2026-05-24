import apiClient from './client';

export interface OnboardSchoolPayload {
  name: string;
  branch_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  attendance_mode?: string;
  uses_saturday?: boolean;
  admin_phone: string;
}

export const onboardSchool = (payload: OnboardSchoolPayload) =>
  apiClient.post('/superadmin/onboard-school', payload).then((r) => r.data);

export interface SchoolSettings {
  id: string;
  name: string;
  branch_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  attendance_mode: string;
  uses_saturday: boolean;
  is_active: boolean;
}

export const getSchool = (id: string) =>
  apiClient.get(`/schools/${id}`).then((r) => r.data);

export const updateSchool = (id: string, data: Partial<Omit<SchoolSettings, 'id' | 'is_active'>>) =>
  apiClient.put(`/schools/${id}`, data).then((r) => r.data);
