import apiClient from './client';

export const markStudentAttendance = (data: unknown) =>
  apiClient.post('/attendance/students/mark', data).then((r) => r.data);

export const getStudentAttendanceHistory = (params?: Record<string, unknown>) =>
  apiClient.get('/attendance/history/students', { params }).then((r) => r.data);

export const markStaffAttendance = (data: unknown) =>
  apiClient.post('/attendance/staff/mark', data).then((r) => r.data);

export const getStaffAttendance = (params?: Record<string, unknown>) =>
  apiClient.get('/attendance/staff', { params }).then((r) => r.data);
