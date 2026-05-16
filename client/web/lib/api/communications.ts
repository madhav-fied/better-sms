import apiClient from './client';

export const getNotices = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/notices', { params }).then((r) => r.data);

export const getNotice = (id: string) =>
  apiClient.get(`/communications/notices/${id}`).then((r) => r.data);

export const createNotice = (data: unknown) =>
  apiClient.post('/communications/notices', data).then((r) => r.data);

export const updateNotice = (id: string, data: Record<string, unknown>) =>
  apiClient.put(`/communications/notices/${id}`, data).then((r) => r.data);

export const getConcerns = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/concerns', { params }).then((r) => r.data);

export const getConcern = (id: string) =>
  apiClient.get(`/communications/concerns/${id}`).then((r) => r.data);

export const replyConcern = (id: string, message: string) =>
  apiClient.post(`/communications/concerns/${id}/messages`, { message }).then((r) => r.data);

export const getSyllabus = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/syllabus', { params }).then((r) => r.data);

export const getSyllabusById = (id: string) =>
  apiClient.get(`/communications/syllabus/${id}`).then((r) => r.data);

export const updateSyllabus = (id: string, data: Record<string, unknown>) =>
  apiClient.put(`/communications/syllabus/${id}`, data).then((r) => r.data);

export const getNewsletters = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/newsletters', { params }).then((r) => r.data);

export const getNewsletter = (id: string) =>
  apiClient.get(`/communications/newsletters/${id}`).then((r) => r.data);

export const updateNewsletter = (id: string, data: Record<string, unknown>) =>
  apiClient.put(`/communications/newsletters/${id}`, data).then((r) => r.data);
