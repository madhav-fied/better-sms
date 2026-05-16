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
