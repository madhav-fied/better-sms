import apiClient from './client';

export interface PeriodConfigItem {
  period_number: number;
  label: string;
  start_time: string;
  end_time: string;
  period_type: 'regular' | 'break' | 'assembly';
}

export interface TimetableSlot {
  day_of_week: number;
  period_number: number;
  subject?: string;
  subject_id?: string;
  teacher_staff_id?: string;
}

export const getPeriodConfig = () =>
  apiClient.get('/timetable/period-config').then((r) => r.data);

export const updatePeriodConfig = (periods: PeriodConfigItem[]) =>
  apiClient.put('/timetable/period-config', { periods }).then((r) => r.data);

export const getTimetable = (params?: Record<string, unknown>) =>
  apiClient.get('/timetable', { params }).then((r) => r.data);

export const saveTimetable = (data: {
  class_section_id: string;
  academic_year_id: string;
  slots: TimetableSlot[];
}) => apiClient.post('/timetable', data).then((r) => r.data);

export const updateTimetable = (id: string, data: { slots: TimetableSlot[] }) =>
  apiClient.put(`/timetable/${id}`, data).then((r) => r.data);

export const publishTimetable = (id: string) =>
  apiClient.post(`/timetable/${id}/publish`).then((r) => r.data);
