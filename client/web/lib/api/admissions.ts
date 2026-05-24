import apiClient from './client';

export const getEnquiries = (params?: Record<string, unknown>) =>
  apiClient.get('/enquiries', { params }).then((r) => r.data);

export const getEnquiry = (id: string) =>
  apiClient.get(`/enquiries/${id}`).then((r) => r.data);

export const createEnquiry = (data: unknown) =>
  apiClient.post('/enquiries', data).then((r) => r.data);

export const convertEnquiry = (id: string, data: unknown) =>
  apiClient.post(`/enquiries/${id}/convert`, data).then((r) => r.data);

export const getRegistrations = (params?: Record<string, unknown>) =>
  apiClient.get('/registrations', { params }).then((r) => r.data);

export const getRegistration = (id: string) =>
  apiClient.get(`/registrations/${id}`).then((r) => r.data);

export const acceptRegistration = (id: string) =>
  apiClient.post(`/registrations/${id}/accept`).then((r) => r.data);

export const rejectRegistration = (id: string) =>
  apiClient.post(`/registrations/${id}/reject`).then((r) => r.data);

export const admitStudent = (data: unknown) =>
  apiClient.post('/students/admit', data).then((r) => r.data);
