import apiClient from './client';

export const getExams = (params?: Record<string, unknown>) =>
  apiClient.get('/exams', { params }).then((r) => r.data);
