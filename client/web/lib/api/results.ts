import apiClient from './client';

export interface ResultBulkItem {
  exam_id: string;
  class_section_id: string;
  subject: string;
  student_id: string;
  marks_obtained?: number | null;
  max_marks: number;
  passing_marks: number;
  is_absent?: boolean;
  is_exempt?: boolean;
}

export const getResults = (params?: Record<string, unknown>) =>
  apiClient.get('/results', { params }).then((r) => r.data);

export const bulkSaveResults = (payload: {
  results: ResultBulkItem[];
}) => apiClient.post('/results/bulk', payload).then((r) => r.data);

export const publishResults = (data: { exam_id: string; class_section_id?: string; subject?: string }) =>
  apiClient.post('/results/publish', data).then((r) => r.data);

export const unpublishResults = (data: { exam_id: string; class_section_id?: string; subject?: string }) =>
  apiClient.post('/results/unpublish', data).then((r) => r.data);

export const getMarksheet = (params: { exam_id: string; student_id: string }) =>
  apiClient.get('/results/marksheet', { params }).then((r) => r.data);
