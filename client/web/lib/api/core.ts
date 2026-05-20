import apiClient from './client';

// ── Academic Years ────────────────────────────────────────────────────────────

export const getAcademicYears = (params?: Record<string, unknown>) =>
  apiClient.get('/academic-years', { params }).then((r) => r.data);

export const createAcademicYear = (data: { label: string; start_date: string; end_date: string; school_id: string }) =>
  apiClient.post('/academic-years', data).then((r) => r.data);

export const updateAcademicYear = (id: string, data: { label?: string; start_date?: string; end_date?: string }) =>
  apiClient.put(`/academic-years/${id}`, data).then((r) => r.data);

export const activateAcademicYear = (id: string) =>
  apiClient.post(`/academic-years/${id}/activate`).then((r) => r.data);

export const deleteAcademicYear = (id: string) =>
  apiClient.delete(`/academic-years/${id}`).then((r) => r.data);

// ── Class Sections ────────────────────────────────────────────────────────────

export const getClassSections = (params?: Record<string, unknown>) =>
  apiClient.get('/class-sections', { params }).then((r) => r.data);

export const createClassSection = (data: {
  school_id: string;
  academic_year_id: string;
  class_name: string;
  section: string;
  class_teacher_id?: string;
}) => apiClient.post('/class-sections', data).then((r) => r.data);

export const updateClassSection = (id: string, data: {
  class_name?: string;
  section?: string;
  class_teacher_id?: string | null;
}) => apiClient.put(`/class-sections/${id}`, data).then((r) => r.data);

export const deleteClassSection = (id: string) =>
  apiClient.delete(`/class-sections/${id}`).then((r) => r.data);

export const getClassSection = (id: string) =>
  apiClient.get(`/class-sections/${id}`).then((r) => r.data);

// Roster — students
export const getRosterStudents = (csId: string, params?: Record<string, unknown>) =>
  apiClient.get(`/class-sections/${csId}/students`, { params }).then((r) => r.data);

export const assignStudentsToClass = (csId: string, studentIds: string[]) =>
  apiClient.post(`/class-sections/${csId}/students`, { student_ids: studentIds }).then((r) => r.data);

export const removeStudentFromClass = (csId: string, studentId: string) =>
  apiClient.delete(`/class-sections/${csId}/students/${studentId}`).then((r) => r.data);

// Roster — subjects
export const getClassSubjects = (csId: string) =>
  apiClient.get(`/class-sections/${csId}/subjects`).then((r) => r.data);

export const assignSubjectToClass = (csId: string, data: { subject: string; staff_id: string; academic_year_id?: string }) =>
  apiClient.post(`/class-sections/${csId}/subjects`, data).then((r) => r.data);

export const updateClassSubject = (csId: string, tsId: string, data: { staff_id?: string; subject?: string }) =>
  apiClient.put(`/class-sections/${csId}/subjects/${tsId}`, data).then((r) => r.data);

export const removeClassSubject = (csId: string, tsId: string) =>
  apiClient.delete(`/class-sections/${csId}/subjects/${tsId}`).then((r) => r.data);

// ── Subjects catalog ──────────────────────────────────────────────────────────

export const getSubjects = (params?: Record<string, unknown>) =>
  apiClient.get('/subjects', { params }).then((r) => r.data);
