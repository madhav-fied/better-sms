import apiClient from './client';

export const getDashboardSummary = () =>
  apiClient.get('/dashboard/header-summary').then((r) => r.data);

export const getBirthdays = () =>
  apiClient.get('/dashboard/birthdays').then((r) => r.data);
