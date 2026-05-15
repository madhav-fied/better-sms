import apiClient from './client';

export const getResults = (params?: Record<string, unknown>) =>
  apiClient.get('/results', { params }).then((r) => r.data);

export const bulkSaveResults = (records: unknown[]) =>
  apiClient.post('/results/bulk', { records }).then((r) => r.data);

export const publishResults = (data: unknown) =>
  apiClient.post('/results/publish', data).then((r) => r.data);

export const unpublishResults = (data: unknown) =>
  apiClient.post('/results/unpublish', data).then((r) => r.data);
