import apiClient from './client';

export const getNotices = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/notices', { params }).then((r) => r.data);

export const getNotice = (id: string) =>
  apiClient.get(`/communications/notices/${id}`).then((r) => r.data);

export const createNotice = (data: unknown) =>
  apiClient.post('/communications/notices', data).then((r) => r.data);

export const getConcerns = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/concerns', { params }).then((r) => r.data);

export const getConcern = (id: string) =>
  apiClient.get(`/communications/concerns/${id}`).then((r) => r.data);

export const createConcern = (data: unknown) =>
  apiClient.post('/communications/concerns', data).then((r) => r.data);

export const replyConcern = (id: string, body: string) =>
  apiClient.post(`/communications/concerns/${id}/messages`, { body }).then((r) => r.data);

export const getSyllabus = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/syllabus', { params }).then((r) => r.data);

export const getSyllabusItem = (id: string) =>
  apiClient.get(`/communications/syllabus/${id}`).then((r) => r.data);

export const createSyllabus = (data: unknown) =>
  apiClient.post('/communications/syllabus', data).then((r) => r.data);

export const getNewsletters = (params?: Record<string, unknown>) =>
  apiClient.get('/communications/newsletters', { params }).then((r) => r.data);

export const getNewsletter = (id: string) =>
  apiClient.get(`/communications/newsletters/${id}`).then((r) => r.data);

export const createNewsletter = (data: unknown) =>
  apiClient.post('/communications/newsletters', data).then((r) => r.data);
