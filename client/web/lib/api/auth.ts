import apiClient from './client';

export interface LoginAccount {
  school_id: string | null;
  school_name: string;
  role: string;
  user_id: string;
}

export const passwordLogin = (payload: {
  identifier: string;
  password: string;
  school_id?: string | null;
  user_id?: string;
}) => {
  const body: Record<string, string | null> = {
    identifier: payload.identifier,
    password: payload.password,
  };
  if (payload.school_id !== undefined) body.school_id = payload.school_id;
  if (payload.user_id) body.user_id = payload.user_id;
  return apiClient.post('/auth/login', body).then((r) => r.data);
};

export const register = (payload: {
  email: string;
  phone: string;
  password: string;
  role?: string;
  school_id?: string;
}) => apiClient.post('/auth/register', payload).then((r) => r.data);

export const forgotPassword = (payload: {
  email: string;
  school_id?: string | null;
  user_id?: string;
}) => {
  const body: Record<string, string | null> = { email: payload.email };
  if (payload.school_id !== undefined) body.school_id = payload.school_id;
  if (payload.user_id) body.user_id = payload.user_id;
  return apiClient.post('/auth/forgot-password', body).then((r) => r.data);
};

export const resetPassword = (token: string, password: string) =>
  apiClient.post('/auth/reset-password', { token, password }).then((r) => r.data);

export const getMe = () => apiClient.get('/auth/me').then((r) => r.data);
