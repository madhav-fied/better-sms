import apiClient from './client';

export const getPeriodConfig = () =>
  apiClient.get('/timetable/period-config').then((r) => r.data);

export const updatePeriodConfig = (data: unknown) =>
  apiClient.put('/timetable/period-config', data).then((r) => r.data);

export const getTimetable = (params?: Record<string, unknown>) =>
  apiClient.get('/timetable', { params }).then((r) => r.data);

export const saveTimetable = (data: unknown) =>
  apiClient.post('/timetable', data).then((r) => r.data);

export const updateTimetable = (id: string, data: unknown) =>
  apiClient.put(`/timetable/${id}`, data).then((r) => r.data);

export const publishTimetable = (id: string) =>
  apiClient.post(`/timetable/${id}/publish`).then((r) => r.data);
