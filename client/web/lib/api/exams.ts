import apiClient from './client';

export const getExams = (params?: Record<string, unknown>) =>
  apiClient.get('/exams', { params }).then((r) => r.data);

export const getExam = (id: string) =>
  apiClient.get(`/exams/${id}`).then((r) => r.data);

export const createExam = (data: unknown) =>
  apiClient.post('/exams', data).then((r) => r.data);

export const getExamSchedule = (examId: string) =>
  apiClient.get(`/exams/${examId}/schedule`).then((r) => r.data);

export const createExamSchedule = (examId: string, data: unknown) =>
  apiClient.post(`/exams/${examId}/schedule`, data).then((r) => r.data);
