import apiClient from './client';

export const getDashboardSummary = () =>
  apiClient.get('/dashboard/header-summary').then((r) => r.data);

export const getClassAttendance = () =>
  apiClient.post('/dashboard/class-attendance', {}).then((r) => r.data);

export const getTeacherAttendanceSummary = () =>
  apiClient.post('/dashboard/teacher-attendance-summary', {}).then((r) => r.data);

export const getBirthdays = () =>
  apiClient.get('/dashboard/birthdays').then((r) => r.data);
