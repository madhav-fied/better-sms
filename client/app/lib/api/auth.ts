import apiClient from './client';

export const passwordLogin = (payload: {
  identifier: string;
  password: string;
  school_id?: string;
  user_id?: string;
}) => {
  const body: Record<string, string> = {
    identifier: payload.identifier,
    password: payload.password,
  };
  if (payload.school_id) body.school_id = payload.school_id;
  if (payload.user_id) body.user_id = payload.user_id;
  return apiClient.post('/auth/login', body).then((r) => r.data);
};

export const getMe = () => apiClient.get('/auth/me').then((r) => r.data);

export const logout = () => apiClient.post('/auth/logout').then((r) => r.data);
