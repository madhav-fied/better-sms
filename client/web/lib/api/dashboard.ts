import apiClient from './client';

type BirthdayEntry = { name: string; dob: string; type?: string };

function normalizeBirthdays(payload: unknown): BirthdayEntry[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { birthdays?: unknown }).birthdays)) {
    return (payload as { birthdays: BirthdayEntry[] }).birthdays;
  }
  return [];
}

export const getDashboardSummary = () =>
  apiClient.get('/dashboard/header-summary').then((r) => r.data);

export const getBirthdays = () =>
  apiClient.get('/dashboard/birthdays').then((r) => ({
    ...r.data,
    data: normalizeBirthdays(r.data?.data),
  }));
