import apiClient from './client';

export const getEnquiries = (params?: Record<string, unknown>) =>
  apiClient.get('/enquiries', { params }).then((r) => r.data);

export const getEnquiry = (id: string) =>
  apiClient.get(`/enquiries/${id}`).then((r) => r.data);

export const createEnquiry = (data: Record<string, unknown>) =>
  apiClient.post('/enquiries', data).then((r) => r.data);

export const updateEnquiry = (id: string, data: Record<string, unknown>) =>
  apiClient.put(`/enquiries/${id}`, data).then((r) => r.data);

export const convertEnquiry = (id: string) =>
  apiClient.post(`/enquiries/${id}/convert`, {}).then((r) => r.data);

export const updateEnquiryStatus = (id: string, status: string) =>
  apiClient.patch(`/enquiries/${id}/status`, { status }).then((r) => r.data);

export const updateRegistrationStatus = (id: string, status: string) =>
  apiClient.patch(`/registrations/${id}/status`, { status }).then((r) => r.data);

export const createRegistration = (data: {
  student_fields: Record<string, unknown>;
  parent_guardians?: Array<{ relation: string; first_name: string; name?: string; phone?: string }>;
}) => apiClient.post('/registrations', data).then((r) => r.data);

export const getRegistrations = (params?: Record<string, unknown>) =>
  apiClient.get('/registrations', { params }).then((r) => r.data);

export const getRegistration = (id: string) =>
  apiClient.get(`/registrations/${id}`).then((r) => r.data);

export const acceptRegistration = (id: string) =>
  apiClient.post(`/registrations/${id}/accept`).then((r) => r.data);

export const rejectRegistration = (id: string, reason: string) =>
  apiClient.post(`/registrations/${id}/reject`, { reason }).then((r) => r.data);

export const admitStudent = (data: {
  registration_id: string;
  class_section_id: string;
  student_type?: string;
  hosteller?: boolean;
  admission_type?: string;
}) => apiClient.post('/students/admit', data).then((r) => r.data);
