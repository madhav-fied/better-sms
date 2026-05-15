import apiClient from './client';

export const getTimetable = (params?: Record<string, unknown>) =>
  apiClient.get('/timetable', { params }).then((r) => r.data);
