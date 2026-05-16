import apiClient from './client';

export const getAttendanceHistory = (params?: Record<string, unknown>) =>
  apiClient.get('/attendance/history/students', { params }).then((r) => r.data);

export const markStudentAttendance = (data: unknown) =>
  apiClient.post('/attendance/students/mark', data).then((r) => r.data);
